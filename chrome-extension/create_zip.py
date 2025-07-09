#!/usr/bin/env python3
import zipfile
import os
from pathlib import Path

def create_extension_zip():
    # Create zip file
    zip_path = "replyguy-chrome-extension-v1.0.zip"
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Walk through dist directory
        dist_path = Path("dist")
        for file_path in dist_path.rglob("*"):
            if file_path.is_file():
                # Add file to zip with relative path from dist
                arcname = str(file_path.relative_to(dist_path))
                zipf.write(file_path, arcname)
                print(f"Added: {arcname}")
    
    # Get file size
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\nCreated: {zip_path}")
    print(f"Size: {size_mb:.2f} MB")
    
    # Chrome Web Store has a 10MB limit
    if size_mb > 10:
        print("WARNING: File exceeds Chrome Web Store 10MB limit!")
    else:
        print("✓ File size is within Chrome Web Store limits")

if __name__ == "__main__":
    create_extension_zip()