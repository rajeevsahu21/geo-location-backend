import XLSX from "xlsx";
import path from "path";

const exportToExcel = async (
  data,
  workSheetColumnName,
  workSheetName,
  filePath
) => {
  const wb = XLSX.utils.book_new();
  const workSheetData = [workSheetColumnName, ...data];
  const ws = XLSX.utils.aoa_to_sheet(workSheetData);
  XLSX.utils.book_append_sheet(wb, ws, workSheetName);
  await XLSX.writeFile(wb, path.resolve(filePath));
};

const readExcel = (file) => {
  const workbook = XLSX.readFile(file);
  const wsnames = workbook.SheetNames;
  const worksheet = workbook.Sheets[wsnames[0]];
  const length = +worksheet["!ref"].split(":")[1].charAt(1);
  let emails = [];
  for (let i = 1; i <= length; i++) {
    if (worksheet[`A${i}`]) emails.push(worksheet[`A${i}`].v);
  }
  return emails;
};

export { exportToExcel, readExcel };
