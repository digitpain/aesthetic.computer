# this is a shell script for converting all pngs in a directory to webp
# (requires imagemagick)
for file in *.png;
  convert $file -define webp:lossless=true (basename $file .png).webp
end