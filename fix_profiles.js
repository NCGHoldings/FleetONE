const fs = require('fs');
const filePath = 'src/hooks/useAccountingData.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix useAllProfiles
content = content.replace(
`export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["all-profiles"],
    enabled: !!effectiveCompanyId,
    queryFn: async () => {
      if (!effectiveCompanyId) return null;`,
`export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed useAllProfiles');
