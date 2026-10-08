from PIL import Image
import base64
from io import BytesIO

img = Image.open('C:/Users/sures/Downloads/GCC_Election/WhatsApp Image 2026-09-29 at 6.54.05 PM.jpeg').convert('RGB')

# Let's crop based on precise coordinates
# The image is 960 x 1280
# Thumb impression is invalid vote #4.
# Invalid votes start around y=400 and go to y=1100.
# 1. 400 - 550
# 2. 550 - 700
# 3. 700 - 850
# 4. 850 - 1000  <- Thumb impression
# X coordinate for the thumb mark should be in the right column, roughly x=480 to x=600

# Let's write out a few cropped versions to check
crop1 = img.crop((450, 800, 600, 950))
crop2 = img.crop((400, 850, 650, 1050))
crop3 = img.crop((480, 850, 580, 950))

# To find the true thumb print, let's do a basic color check
def find_blue_bbox(image):
    min_x, min_y, max_x, max_y = image.width, image.height, 0, 0
    has_blue = False
    for y in range(image.height):
        for x in range(image.width):
            r, g, b = image.getpixel((x, y))
            # The thumbprint is a purplish blue in the image.
            if b > r + 20 and b > g + 20 and b < 200:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                has_blue = True
    if has_blue:
        # Add padding
        return max(0, min_x-10), max(0, min_y-10), min(image.width, max_x+10), min(image.height, max_y+10)
    return None

box = find_blue_bbox(crop2)
if box:
    final_crop = crop2.crop(box)
else:
    final_crop = crop3

# Now let's make the background white transparent and keep only the dark/blue pixels for a clean stamp
final_crop = final_crop.convert("RGBA")
data = final_crop.getdata()
new_data = []
for item in data:
    # If the pixel is light, make it transparent
    if item[0] > 180 and item[1] > 180 and item[2] > 180:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)
final_crop.putdata(new_data)

buffer = BytesIO()
final_crop.save(buffer, format="PNG")
b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

with open("thumb_base64.txt", "w") as f:
    f.write("data:image/png;base64," + b64_str)
print("Saved to thumb_base64.txt")
