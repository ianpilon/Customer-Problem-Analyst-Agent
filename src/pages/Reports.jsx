import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Reports = () => {
  const [savedReports, setSavedReports] = useState([]);

  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    setSavedReports(reports);
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Saved Reports</h1>
      {savedReports.length === 0 ? (
        <p>No saved reports yet.</p>
      ) : (
        savedReports.map((report) => (
          <Card key={report.id} className="mb-4">
            <CardHeader>
              <CardTitle>Report from {new Date(report.date).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {Object.entries(report.results).map(([agentId, result]) => (
                  <AccordionItem key={agentId} value={agentId}>
                    <AccordionTrigger>{agentId}</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap">{result}</pre>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Reports;