
import fs from 'fs';
const content = fs.readFileSync('c:/Users/ajsfe/.gemini/antigravity/scratch/drift-app/utils/nexusEngine.ts', 'utf8');
let balance = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') balance++;
  if (content[i] === '}') balance--;
}
console.log('Balance:', balance);
