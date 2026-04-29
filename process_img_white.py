import os
from PIL import Image

def make_transparent():
    input_path = '/Users/staff/Documents/Developments/FleetOne/FleetONE/public/pwa-192x192.png'
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            r, g, b, a = item
            # Only remove pure white or very close to white background
            if r > 240 and g > 240 and b > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(input_path, "PNG")
        
        sizes = [
            (512, "pwa-512x512.png"),
            (180, "apple-touch-icon.png")
        ]
        
        for size, name in sizes:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(os.path.join('/Users/staff/Documents/Developments/FleetOne/FleetONE/public', name), "PNG")
            
        icon = img.resize((32, 32), Image.Resampling.LANCZOS)
        icon.save('/Users/staff/Documents/Developments/FleetOne/FleetONE/public/favicon.ico', format="ICO")
        
        print("Images processed successfully with ONLY white background removed.")
        
    except Exception as e:
        print(f"Error: {e}")

make_transparent()
