"use client";

import React, { useState } from "react";
import { FileText, Download, Plus, Check, RefreshCw, AlertCircle } from "lucide-react";

interface ReportItem {
  id: number;
  name: string;
  circuitName: string;
  summary: string;
  date: string;
  filePath?: string;
}

export default function ReportsStudio() {
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 1,
      name: "RC Network Transient Analysis",
      circuitName: "Series RC Filter Circuit",
      summary: "Transient simulation of a series RC filter. Verifies capacitor charging voltage potential curves matching exponential growth equations.",
      date: "2026-06-07 10:15",
      filePath: "/static/reports/report_1_rc.pdf"
    },
    {
      id: 2,
      name: "Induction Motor Full-Load Test",
      circuitName: "Induction Motor Analyzer",
      summary: "Analysis of stator currents, shaft developed torque, rotor copper losses, and load efficiencies for a 415V 4-pole motor.",
      date: "2026-06-07 11:20",
      filePath: "/static/reports/report_2_im.pdf"
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [reportName, setReportName] = useState("Bridge Rectifier Efficiency Sheet");
  const [circuitType, setCircuitType] = useState("Bridge Rectifier Simulator");
  const [summaryText, setSummaryText] = useState("Numerical evaluation of single phase bridge rectifier. Evaluates average and RMS voltages, ripple factors, and conversion efficiency under full resistive load.");

  const handleGenerateReport = async () => {
    setIsLoading(true);
    
    const payload = {
      project_id: 1,
      name: reportName,
      summary: summaryText,
      circuit_id: 1
    };

    try {
      const res = await fetch("http://localhost:8000/api/v1/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setReports([
          {
            id: data.id,
            name: data.name,
            circuitName: circuitType,
            summary: data.summary,
            date: new Date().toISOString().replace("T", " ").slice(0, 16),
            filePath: `http://localhost:8000/api/v1/reports/${data.id}/download`
          },
          ...reports
        ]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend offline. Generating mock report locally.");
    }

    // LOCAL MOCK REPORT GENERATION (Offline mode)
    setTimeout(() => {
      const mockId = reports.length + 1;
      const newReport: ReportItem = {
        id: mockId,
        name: reportName,
        circuitName: circuitType,
        summary: summaryText,
        date: new Date().toISOString().replace("T", " ").slice(0, 16),
        filePath: "#" // mock download
      };
      setReports([newReport, ...reports]);
      setIsLoading(false);
    }, 1000);
  };

  const handleDownloadReport = (report: ReportItem) => {
    if (report.filePath && report.filePath !== "#") {
      window.open(report.filePath, "_blank");
    } else {
      // Mock alert for local file download
      alert(`Downloading ${report.name}.pdf...\n\nOffline Mode Notice: The document has been exported. Connect to a running FastAPI backend service to trigger the reportlab compiler and save actual PDF sheets.`);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b pb-5 border-slate-200 dark:border-slate-800">
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span>Project Reports Generator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Export simulation graphs, metrics, and equations to PDF documents.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. COMPILE REPORT FORM */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center space-x-1.5">
              <Plus className="h-4 w-4 text-blue-500" />
              <span>Compile PDF Report</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Report Sheet Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Select Circuit/Machine Source</label>
                <select
                  value={circuitType}
                  onChange={(e) => setCircuitType(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="Series RC Filter Circuit">Series RC Filter Circuit</option>
                  <option value="Induction Motor Analyzer">Induction Motor Analyzer</option>
                  <option value="Bridge Rectifier Simulator">Bridge Rectifier Simulator</option>
                  <option value="Buck DC-DC Chopper">Buck DC-DC Chopper</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Executive Summary Review</label>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  className="w-full h-24 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span>{isLoading ? "Compiling..." : "Export Report PDF"}</span>
              </button>
            </div>
          </div>

          {/* 2. REPORTS LIST */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="h-4.5 w-4.5 text-blue-500" />
              <span>Generated Sheets</span>
            </h3>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex justify-between items-start gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4 className="font-bold text-slate-950 dark:text-white text-sm">{report.name}</h4>
                      <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                        {report.circuitName}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-normal">{report.summary}</p>
                    <div className="text-[10px] text-slate-400">Created: {report.date}</div>
                  </div>

                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
