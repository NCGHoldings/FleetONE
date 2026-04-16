const fs = require('fs');
const path = require('path');

const publicBusDetailsDir = path.join(__dirname, '../public/bus_details');
const outputFile = path.join(__dirname, '../src/data/bus_documents.json');

const generateManifest = () => {
  const manifest = {};
  
  if (!fs.existsSync(publicBusDetailsDir)) {
    console.error(`Directory not found: ${publicBusDetailsDir}`);
    fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
    return;
  }

  const busFolders = fs.readdirSync(publicBusDetailsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const bus of busFolders) {
    const busPath = path.join(publicBusDetailsDir, bus);
    
    // Read recursively in case there are subdirectories (e.g., year folders)
    const filesList = [];
    const readDirRecursively = (dir, basePath = '') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          readDirRecursively(path.join(dir, item.name), path.join(basePath, item.name));
        } else {
          filesList.push(path.join(basePath, item.name));
        }
      }
    };
    
    readDirRecursively(busPath);
    manifest[bus] = filesList;
  }

  // Ensure src/data exists
  const dataDir = path.dirname(outputFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
  console.log(`Successfully generated manifest at ${outputFile} with ${Object.keys(manifest).length} buses.`);
};

generateManifest();
