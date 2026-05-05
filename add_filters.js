const fs = require('fs');
const path = require('path');

const targetDir = 'src/components/accounting';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(targetDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Only modify if it imports DataTable
    if (content.includes('DataTable')) {
        // Regex to find <DataTable without enableColumnFilters
        // We match <DataTable followed by any whitespace or props, until we hit either enableColumnFilters or >
        // A simpler approach: Just replace `<DataTable` with `<DataTable enableColumnFilters` 
        // But we must make sure we don't duplicate it.
        
        let newContent = content;
        
        // Find all indices of <DataTable
        let index = newContent.indexOf('<DataTable');
        let modified = false;
        
        while (index !== -1) {
            // Check if it already has enableColumnFilters before the closing >
            const closingIndex = newContent.indexOf('>', index);
            if (closingIndex !== -1) {
                const tagContent = newContent.substring(index, closingIndex);
                if (!tagContent.includes('enableColumnFilters')) {
                    newContent = newContent.substring(0, index + 10) + ' enableColumnFilters' + newContent.substring(index + 10);
                    modified = true;
                }
            }
            index = newContent.indexOf('<DataTable', index + 1);
        }
        
        if (modified) {
            fs.writeFileSync(file, newContent, 'utf8');
            changedFiles++;
            console.log(`Updated ${file}`);
        }
    }
});

console.log(`Total files updated: ${changedFiles}`);
