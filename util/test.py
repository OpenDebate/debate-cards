from docx import Document

document = Document('./Input.docx')

for p in document.paragraphs:
    for r in p:
      print(r)