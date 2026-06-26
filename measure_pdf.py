import fitz
import sys

def analyze_pdf(filepath):
    print(f"--- Analyzing {filepath} ---")
    doc = fitz.open(filepath)
    print(f"Page count: {len(doc)}")
    for i, page in enumerate(doc):
        # get page dimensions
        rect = page.rect
        print(f"Page {i+1} dimensions: {rect.width} x {rect.height} pt")
        
        # get blocks of text
        blocks = page.get_text("blocks")
        if not blocks:
            print("No text blocks found.")
            continue
        
        # find the min y0 and max y1
        min_y = min(b[1] for b in blocks)
        max_y = max(b[3] for b in blocks)
        content_height = max_y - min_y
        percentage = (content_height / rect.height) * 100
        print(f"Content bounds: Y-min={min_y:.1f}, Y-max={max_y:.1f}")
        print(f"Content height: {content_height:.1f} pt")
        print(f"Utilized height percentage: {percentage:.1f}%")

        # Check logo/header by looking at images
        images = page.get_images(full=True)
        print(f"Images found: {len(images)}")
        for img in images:
            xref = img[0]
            bbox = page.get_image_bbox(img)
            print(f"Image bbox: {bbox}")

analyze_pdf("signalbands-test.pdf")
analyze_pdf("minimal-test.pdf")
