// UploadContacts.jsx
import React from "react";
import * as XLSX from "xlsx";
import { readString } from "react-papaparse";

const UploadContacts = ({ onContactsParsed }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split(".").pop().toLowerCase();

    reader.onload = (evt) => {
      const data = evt.target.result;
      let contacts = [];

      if (extension === "csv") {
        const parsed = readString(data, { header: true });
        contacts = parsed.data.map((row) => row.number || row.Number || row.phone);
      } else if (extension === "xlsx" || extension === "xls") {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        contacts = json.map((row) => row.number || row.Number || row.phone);
      } else {
        alert("Unsupported file type");
        return;
      }

      onContactsParsed(contacts);
    };

    if (extension === "csv") reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  return (
    <div style={{ margin: "10px 0" }}>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
    </div>
  );
};

export default UploadContacts;
