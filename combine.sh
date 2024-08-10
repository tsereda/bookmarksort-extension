for file in background.html background.js bookmarkUtils.js  manifest.json popup.html popup.js visualization.js; do 
    echo -e "\n--- Start of $file ---\n";
    cat "$file";
    echo -e "\n--- End of $file ---\n";
done > combined_output.txt