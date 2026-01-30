import React, { useState, useEffect } from 'react';
import { Header, MainContent, type TabId } from './components/Layout';
import { ResumeEditor, ResumePreview } from './components/Resume';
import { JobApplicationView } from './components/JobApplication';
import { SettingsView } from './components/Settings';
import { RecentExports } from './components/History';
import { useResume } from './hooks/useResume';
import { useJobApplication } from './hooks/useJobApplication';

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('resume');
  const resumeState = useResume();
  const jobApplicationState = useJobApplication();

  // Keep job application's original resume in sync with the main resume
  useEffect(() => {
    jobApplicationState.setOriginalResume(resumeState.resume);
  }, [resumeState.resume, jobApplicationState.setOriginalResume]);

  const renderTabContent = (): React.JSX.Element => {
    switch (activeTab) {
      case 'resume':
        return (
          <div className="tab-content">
            <div className="resume-view">
              <div className="resume-view__editor-panel">
                <ResumeEditor
                  jsonText={resumeState.jsonText}
                  onJsonTextChange={resumeState.setJsonText}
                  onValidate={resumeState.validate}
                  onLoadFromFile={resumeState.loadFromFile}
                  onSaveToFile={resumeState.saveToFile}
                  validationErrors={resumeState.validationErrors}
                  isValid={resumeState.isValid}
                  filePath={resumeState.filePath}
                  isDirty={resumeState.isDirty}
                />
                <div className="resume-view__history-section">
                  <RecentExports maxEntries={5} showHeader={true} />
                </div>
              </div>
              <div className="resume-view__preview-panel">
                {resumeState.resume ? (
                  <ResumePreview resume={resumeState.resume} />
                ) : (
                  <div className="resume-view__preview-placeholder">
                    Enter and validate your resume JSON to see a preview
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'job-application':
        return (
          <div className="tab-content">
            <JobApplicationView
              currentStep={jobApplicationState.currentStep}
              jobPosting={jobApplicationState.jobPosting}
              originalResume={jobApplicationState.originalResume}
              refinedResume={jobApplicationState.refinedResume}
              coverLetter={jobApplicationState.coverLetter}
              aiState={jobApplicationState.aiState}
              error={jobApplicationState.error}
              isAIAvailable={jobApplicationState.isAIAvailable}
              resume={resumeState.resume}
              setJobPosting={jobApplicationState.setJobPosting}
              refineResume={jobApplicationState.refineResume}
              generateCoverLetter={jobApplicationState.generateCoverLetter}
              cancelOperation={jobApplicationState.cancelOperation}
              retry={jobApplicationState.retry}
              clearError={jobApplicationState.clearError}
              resetWorkflow={jobApplicationState.resetWorkflow}
              acceptRefinedResume={jobApplicationState.acceptRefinedResume}
              updateRefinedResume={jobApplicationState.updateRefinedResume}
              acceptCoverLetter={jobApplicationState.acceptCoverLetter}
              updateCoverLetter={jobApplicationState.updateCoverLetter}
            />
          </div>
        );
      case 'settings':
        return (
          <div className="tab-content">
            <SettingsView />
          </div>
        );
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <MainContent>
        {renderTabContent()}
      </MainContent>
    </div>
  );
}

export default App;
