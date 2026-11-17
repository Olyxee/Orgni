"""Text extraction for common office and text document formats."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from xml.etree import ElementTree
from typing import NamedTuple


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


def _column_letter(zero_based_index: int) -> str:
    """Convert a 0-based column index back to an Excel column letter (A, B, …, Z, AA, …)."""
    result = ""
    n = zero_based_index + 1
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        result = chr(ord("A") + remainder) + result
    return result


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


def _resolve_worksheet_display_names(archive: zipfile.ZipFile) -> dict[str, str]:
    """
    Return a mapping from internal sheet path (e.g. 'xl/worksheets/sheet1.xml')
    to the display name shown on the tab (e.g. 'Revenue Summary').

    The mapping is built by joining two OOXML files:
      - xl/workbook.xml   — lists sheets with their display names and rId references
      - xl/_rels/workbook.xml.rels — maps rId references to target file paths

    When either file is absent or malformed the function returns an empty dict
    and the caller falls back to internal names.
    """
    namelist = archive.namelist()
    if "xl/workbook.xml" not in namelist or "xl/_rels/workbook.xml.rels" not in namelist:
        return {}

    try:
        # Build rId → target path map from the relationships file.
        rels_root = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rid_to_target: dict[str, str] = {}
        for rel in rels_root:
            tag = rel.tag.rsplit("}", 1)[-1]
            if tag == "Relationship":
                rid = rel.attrib.get("Id", "")
                target = rel.attrib.get("Target", "")
                if rid and target:
                    # Targets are relative to xl/; normalise to full archive path.
                    if not target.startswith("/"):
                        target = "xl/" + target
                    else:
                        target = target.lstrip("/")
                    rid_to_target[rid] = target

        # Read sheet display names and their rIds from workbook.xml.
        wb_root = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        display_names: dict[str, str] = {}
        for element in wb_root.iter():
            if element.tag.rsplit("}", 1)[-1] == "sheet":
                name = element.attrib.get("name", "")
                # rId may be in a namespaced attribute; try both forms.
                rid = element.attrib.get(
                    "r:id",
                    element.attrib.get(
                        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id",
                        "",
                    ),
                )
                if name and rid and rid in rid_to_target:
                    display_names[rid_to_target[rid]] = name

        return display_names
    except Exception:  # noqa: BLE001 — malformed XML must not crash extraction
        return {}


class _SheetRow(NamedTuple):
    """A single data row extracted from an XLSX worksheet, with location metadata."""

    text: str
    """Human-readable labelled representation, e.g. 'Product: Widget; Revenue: 1000'."""

    worksheet_name: str
    """Display name of the worksheet tab, e.g. 'Revenue Summary'."""

    row_number: int
    """1-based spreadsheet row number of this data row."""

    cells: dict[str, str]
    """
    Mapping of column label → cell value for this row.
    Keys are the header label strings; values are the raw cell strings.
    Cell reference for each column is recoverable via the column_refs mapping.
    """

    column_refs: dict[str, str]
    """
    Mapping of column label → Excel cell reference, e.g. {'Revenue': 'C4'}.
    Populated only when header column positions are known.
    """


def _extract_xlsx_rows(contents: bytes) -> list[_SheetRow]:
    """
    Parse an XLSX file and return one _SheetRow per data row across all sheets.

    This is the structured counterpart to _extract_xlsx: instead of returning
    plain text it returns rich row objects with worksheet name, row number, and
    per-cell column-label → value mappings, so callers can emit structured tokens
    with exact source locations.
    """
    with zipfile.ZipFile(BytesIO(contents)) as archive:
        display_names = _resolve_worksheet_display_names(archive)

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

        result: list[_SheetRow] = []
        sheet_paths = sorted(
            name
            for name in archive.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )

        for sheet_path in sheet_paths:
            worksheet_name = display_names.get(sheet_path, sheet_path)
            root = ElementTree.fromstring(archive.read(sheet_path))

            section = ""
            header_labels: dict[int, str] = {}
            # Maps 0-based column index → original cell reference letter (e.g. column 2 → "C").
            header_col_letters: dict[int, str] = {}

            for row_elem in root.iter():
                if row_elem.tag.rsplit("}", 1)[-1] != "row":
                    continue

                # The r attribute on <row> gives the 1-based spreadsheet row number.
                try:
                    row_number = int(row_elem.attrib.get("r", "0"))
                except ValueError:
                    row_number = 0

                cells: dict[int, str] = {}
                # Maps 0-based column index → Excel column letter extracted from cell ref.
                cell_letters: dict[int, str] = {}
                fallback_column = 0

                for cell in row_elem:
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
                        idx = int(value)
                        value = shared[idx] if idx < len(shared) else value

                    cell_ref = cell.attrib.get("r", "")
                    col_idx = _column_index(cell_ref, fallback_column)
                    cells[col_idx] = value

                    # Extract the letter portion from cell reference (e.g. "B" from "B4").
                    col_letter_match = re.match(r"([A-Z]+)", cell_ref.upper())
                    if col_letter_match:
                        cell_letters[col_idx] = col_letter_match.group(1)

                    fallback_column = col_idx + 1

                nonempty = {
                    col_idx: value.strip()
                    for col_idx, value in cells.items()
                    if value.strip()
                }
                if not nonempty:
                    continue

                if _is_header_row(nonempty):
                    headers = nonempty
                    duplicate_counts = {
                        value.lower(): sum(
                            v.lower() == value.lower() for v in headers.values()
                        )
                        for value in headers.values()
                    }
                    header_labels = {}
                    header_col_letters = {}
                    seen: dict[str, int] = {}
                    for col_idx, value in headers.items():
                        key = value.lower()
                        seen[key] = seen.get(key, 0) + 1
                        suffix = f" {seen[key]}" if duplicate_counts[key] > 1 else ""
                        label = f"{value}{suffix}"
                        header_labels[col_idx] = label
                        # Preserve the column letter for this header position.
                        if col_idx in cell_letters:
                            header_col_letters[col_idx] = cell_letters[col_idx]
                        else:
                            header_col_letters[col_idx] = _column_letter(col_idx)
                    continue

                # A single non-numeric cell is a section heading, not a data row.
                if len(nonempty) == 1 and not any(
                    re.fullmatch(r"[-+]?\d+(?:\.\d+)?", value)
                    for value in nonempty.values()
                ):
                    heading = next(iter(nonempty.values()))
                    section = f"{section} / {heading}" if section else heading
                    continue

                if header_labels:
                    first_header_column = min(header_labels)
                    fields_text: list[str] = []
                    row_cells: dict[str, str] = {}
                    row_col_refs: dict[str, str] = {}

                    for col_idx, value in nonempty.items():
                        label = header_labels.get(col_idx)
                        if label is None:
                            label = (
                                "Item"
                                if col_idx == first_header_column - 1
                                else f"Column {col_idx + 1}"
                            )
                        fields_text.append(f"{label}: {value}")
                        row_cells[label] = value

                        # Build cell reference: column letter + row number.
                        col_letter = (
                            header_col_letters.get(col_idx)
                            or cell_letters.get(col_idx)
                            or _column_letter(col_idx)
                        )
                        if row_number > 0:
                            row_col_refs[label] = f"{col_letter}{row_number}"

                    detail = "; ".join(fields_text)
                    text_line = f"{section}: {detail}" if section else detail

                    result.append(
                        _SheetRow(
                            text=text_line,
                            worksheet_name=worksheet_name,
                            row_number=row_number,
                            cells=row_cells,
                            column_refs=row_col_refs,
                        )
                    )
                else:
                    detail = "\t".join(nonempty.values())
                    text_line = f"{section}: {detail}" if section else detail
                    result.append(
                        _SheetRow(
                            text=text_line,
                            worksheet_name=worksheet_name,
                            row_number=row_number,
                            cells={},
                            column_refs={},
                        )
                    )

        return result


def _extract_xlsx(contents: bytes) -> str:
    """
    Return a plain-text representation of an XLSX workbook for classification
    and legacy tokenization.

    Each data row becomes one line in the form:
      [worksheet_name | row N] Label1: value1; Label2: value2

    The worksheet name and row number are included as a prefix so that the
    generic tokenizer can parse them back out of the content.text string when
    constructing SPREADSHEET_FACT tokens.
    """
    sheet_rows = _extract_xlsx_rows(contents)
    lines: list[str] = []
    for sr in sheet_rows:
        prefix = f"[{sr.worksheet_name} | row {sr.row_number}] " if sr.row_number > 0 else ""
        lines.append(f"{prefix}{sr.text}")
    return "\n".join(lines)


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
