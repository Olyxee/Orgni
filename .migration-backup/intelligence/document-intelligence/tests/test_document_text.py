import io
import os
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from document_text import extract_document_text
from main import app

client = TestClient(app)


def make_archive(files: dict[str, str]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, contents in files.items():
            archive.writestr(name, contents)
    return output.getvalue()


def test_extracts_word_text():
    document = make_archive(
        {
            "word/document.xml": (
                '<w:document xmlns:w="urn:w"><w:body><w:p>'
                "<w:r><w:t>Supplier agreement</w:t></w:r>"
                "<w:r><w:t>R18,450 due</w:t></w:r>"
                "</w:p></w:body></w:document>"
            )
        }
    )
    assert extract_document_text(document, ".docx") == (
        "Supplier agreement R18,450 due"
    )


def test_extracts_powerpoint_slides_in_order():
    presentation = make_archive(
        {
            "ppt/slides/slide2.xml": '<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Second</a:t></p:sld>',
            "ppt/slides/slide1.xml": '<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>First</a:t></p:sld>',
        }
    )
    assert extract_document_text(presentation, ".pptx") == "First\nSecond"


def test_extracts_excel_shared_strings_and_values():
    workbook = make_archive(
        {
            "xl/sharedStrings.xml": (
                '<sst xmlns="urn:x"><si><t>Vendor</t></si>'
                "<si><t>Amount</t></si><si><t>Acme Logistics</t></si></sst>"
            ),
            "xl/worksheets/sheet1.xml": (
                '<worksheet xmlns="urn:x"><sheetData><row>'
                '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
                '<row><c r="A2" t="s"><v>2</v></c><c r="B2"><v>18450</v></c>'
                "</row></sheetData></worksheet>"
            ),
        }
    )
    assert extract_document_text(workbook, ".xlsx") == (
        "Vendor: Acme Logistics; Amount: 18450"
    )


def test_extracts_section_and_item_columns_from_price_list():
    workbook = make_archive(
        {
            "xl/sharedStrings.xml": (
                '<sst xmlns="urn:x"><si><t>Heavy-duty truck parts</t></si>'
                "<si><t>Price</t></si><si><t>Order Code</t></si>"
                "<si><t>Unit</t></si><si><t>Heavy-Duty Transmission</t></si>"
                "<si><t>HDTP00002</t></si><si><t>Each</t></si></sst>"
            ),
            "xl/worksheets/sheet1.xml": (
                '<worksheet xmlns="urn:x"><sheetData>'
                '<row><c r="A1" t="s"><v>0</v></c></row>'
                '<row><c r="B2" t="s"><v>1</v></c><c r="C2" t="s"><v>2</v></c>'
                '<c r="D2" t="s"><v>3</v></c></row>'
                '<row><c r="A3" t="s"><v>4</v></c><c r="B3"><v>17800</v></c>'
                '<c r="C3" t="s"><v>5</v></c><c r="D3" t="s"><v>6</v></c></row>'
                "</sheetData></worksheet>"
            ),
        }
    )
    assert extract_document_text(workbook, ".xlsx") == (
        "Heavy-duty truck parts: Item: Heavy-Duty Transmission; Price: 17800; "
        "Order Code: HDTP00002; Unit: Each"
    )


def test_extracts_csv_as_text():
    csv = b"vendor,amount\nAcme Logistics,18450\n"
    assert "Acme Logistics,18450" in extract_document_text(csv, ".csv")


def test_analyze_endpoint_accepts_word_documents():
    document = make_archive(
        {
            "word/document.xml": (
                '<w:document xmlns:w="urn:w"><w:body><w:p>'
                "<w:r><w:t>Acme Logistics invoice total R18,450</w:t></w:r>"
                "</w:p></w:body></w:document>"
            )
        }
    )
    response = client.post(
        "/v1/analyze",
        files={
            "file": (
                "invoice.docx",
                document,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"source_id": "test_docx", "tenant_id": "test_tenant"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "Acme Logistics" in body["content"]["text"]
    assert not any(
        warning.startswith("unsupported_type") for warning in body["warnings"]
    )
