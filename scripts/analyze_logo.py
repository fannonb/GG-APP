import os
import sys

try:
    from PIL import Image
except ImportError:
    print("PIL (Pillow) is not installed. Trying to install it...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def analyze_colors(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} does not exist.")
        return

    img = Image.open(image_path)
    # Convert to RGB if not already
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Get all colors
    colors = img.getcolors(maxcolors=1000000)
    if colors is None:
        print("Too many colors to count directly. Resizing...")
        # Resize to get dominant colors
        img.thumbnail((150, 150))
        colors = img.getcolors(maxcolors=100000)
    
    # Sort colors by frequency
    sorted_colors = sorted(colors, key=lambda x: x[0], reverse=True)
    
    print("Top 10 colors (Frequency, Hex, RGB):")
    count = 0
    for freq, rgb in sorted_colors:
        # Skip pure white and black if they are just backgrounds
        hex_color = '#{:02x}{:02x}{:02x}'.format(*rgb)
        print(f"{freq:8d} : {hex_color} : RGB{rgb}")
        count += 1
        if count >= 20:
            break

if __name__ == '__main__':
    # Try both possible logo files
    workspace_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo1 = os.path.join(workspace_dir, "GG'APP Main Logo.png")
    logo2 = os.path.join(workspace_dir, "public", "logo.png")
    
    print("Analyzing GG'APP Main Logo.png...")
    analyze_colors(logo1)
    print("\nAnalyzing public/logo.png...")
    analyze_colors(logo2)
