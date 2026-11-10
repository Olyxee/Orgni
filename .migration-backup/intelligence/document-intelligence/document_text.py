"""Text extraction for common office and text document formats."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from xml.etree import ElementTree


def _xml_text(data: bytes, tags: set[str]) -> str:
    root = ElementTree.fromstring(data)
    values: list[str] = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] in tags and element.text:
            values.append(element.text)
    return " ".join(values)


def _archive_parts(contents: bytes, prefix: str, suffix: str = ".xml") -> list[bytes]:
    with zipfile.ZipFile(BytesIO(contents)) as archive:
        names = sorted(
            name
            for name in archive.namelist()
            if name.startswith(prefix) and name.endswith(suffix)
        )
        return [archive.read(name) for name in names]


def _extract_docx(contents: bytes) -> str:
    parts = _archive_parts(contents, "word/document")
    if not parts:
        raise ValueError("Word document has no readable document body")
    return "\n".join(_xml_text(part, {"t"}) for part in parts)


def _extract_pptx(contents: bytes) -> str:
    parts = _archive_parts(contents, "ppt/slides/slide")
    if not parts:
        raise ValueError("PowerPoint file has no readable slides")
    return "\n".join(_xml_text(part, {"t"}) for part in parts)


def _column_index(reference: str, fallback: int) -> int:
    match = re.match(r"([A-Z]+)", reference.upper())
    if not match:
        return fallback
    index = 0
    for character in match.group(1):
        index = index * 26 + ord(character) - ord("A") + 1
    return index - 1


def _is_header_row(cells: dict[int, str]) -> bool:
    labels = {
        "account", "amount", "code", "cost", "cost of sales", "currency",
        "customer", "date", "description", "heavy duty trucks", "item",
        "light duty trucks", "medium duty trucks", "name", "order code",
        "price", "product", "quantity", "qty", "revenue", "status",
        "supplier", "total", "unit", "unit price", "vendor",
    }
    values = [re.sub(r"\s+", " ", value).strip().lower() for value in cells.values()]
    recognized = sum(value in labels for value in values)
    repeated = sum(values.count(value) > 1 for value in set(values) if value)
    return recognized >= 2 or repeated >= 2


def _extract_xlsx(contents: bytes) -> str:
    with zipfile.ZipFile(BytesIO(contents)) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root:
                shared.append(
                    " ".join(
                        node.text or ""
                        for node in item.iter()
                        if node.tag.rsplit("}", 1)[-1] == "t"
                    )
                )

        rows: list[str] = []
        sheet_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        for sheet_name in sheet_names:
            root = ElementTree.fromstring(archive.read(sheet_name))
            section = ""
            header_labels: dict[int, str] = {}
            for row in root.iter():
                if row.tag.rsplit("}", 1)[-1] != "row":
                    continue
                cells: dict[int, str] = {}
                fallback_column = 0
                for cell in row:
                    if cell.tag.rsplit("}", 1)[-1] != "c":
                        continue
                    value = next(
                        (
                            node.text or ""
                            for node in cell.iter()
                            if node.tag.rsplit("}", 1)[-1] in {"v", "t"}
                        ),
                        "",
                    )
                    if cell.attrib.get("t") == "s" and value.isdigit():
                        index = int(value)
                        value = shared[index] if index < len(shared) else value
                    column = _column_index(cell.attrib.get("r", ""), fallback_column)
                    cells[column] = value
                    fallback_column = column + 1

                nonempty = {column: value.strip() for column, value in cells.items() if value.strip()}
                if not nonempty:
                    continue

                if _is_header_row(nonempty):
                    headers = nonempty
                    duplicate_counts = {
                        value.lower(): sum(v.lower() == value.lower() for v in headers.values())
                        for value in headers.values()
                    }
                    header_labels: dict[int, str] = {}
                    seen: dict[str, int] = {}
                    for column, value in headers.items():
                        key = value.lower()
                        seen[key] = seen.get(key, 0) + 1
                        suffix = f" {seen[key]}" if duplicate_counts[key] > 1 else ""
                        header_labels[column] = f"{value}{suffix}"
                    continue

                if len(nonempty) == 1 and not any(
                    re.fullmatch(r"[-+]?\d+(?:\.\d+)?", value)
                    for value in nonempty.values()
                ):
                    heading = next(iter(nonempty.values()))
                    section = f"{section} / {heading}" if section else heading
                    continue

                if header_labels:
                    first_header_column = min(header_labels)
                    fields = []
                    for column, value in nonempty.items():
                        label = header_labels.get(column)
                        if label is None:
                            label = "Item" if column == first_header_column - 1 else f"Column {column + 1}"
                        fields.append(f"{label}: {value}")
                    detail = "; ".join(fields)
                    rows.append(f"{section}: {detail}" if section else detail)
                else:
                    detail = "\t".join(nonempty.values())
                    rows.append(f"{section}: {detail}" if section else detail)
        return "\n".join(rows)


def _extract_rtf(contents: bytes) -> str:
    text = contents.decode("utf-8", errors="replace")
    text = re.sub(r"\\'[0-9a-fA-F]{2}", " ", text)
    text = re.sub(r"\\[a-zA-Z]+-?\d* ?", " ", text)
    text = text.replace("{", " ").replace("}", " ")
    return re.sub(r"\s+", " ", text).strip()


def extract_document_text(contents: bytes, extension: str) -> str:
    """Return readable text from a supported non-PDF document."""
    extension = extension.lower()
    if extension == ".docx":
        return _extract_docx(contents)
    if extension == ".pptx":
        return _extract_pptx(contents)
    if extension == ".xlsx":
        return _extract_xlsx(contents)
    if extension == ".rtf":
        return _extract_rtf(contents)
    return contents.decode("utf-8", errors="replace")
