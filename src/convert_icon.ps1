$magick = "C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 9\Base\Tools\Utilities\Developer Kit\ImageMagick\16bit\magick.exe"
$source = "C:\Users\sgs-laptop\Downloads\my text editor icon.png"
$dest = "icon.ico"

& "$magick" "$source" -define icon:auto-resize=256,128,64,48,32,16 "$dest"
