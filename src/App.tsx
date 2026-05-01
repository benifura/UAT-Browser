import { useEffect, useMemo, useRef, useState } from 'react';
import scenarioPackData from './data/scenarios.json';
import type {
  NavigationStatus,
  SavedProgress,
  Scenario,
  ScenarioPack,
  ScenarioProgress,
  ScenarioResultStatus
} from './types';

const scenarioPack = scenarioPackData as ScenarioPack;
const STORAGE_KEY = 'uat-app-progress';
const RESULT_STATUSES: ScenarioResultStatus[] = ['Pass', 'Fail', 'Partially Passed'];

const emptyProgress: SavedProgress = {
  currentScenarioIndex: null,
  generalComments: '',
  results: {},
  lastSaved: null
};

function getInitialProgress(): SavedProgress {
  const storedProgress = window.localStorage.getItem(STORAGE_KEY);

  if (!storedProgress) {
    return emptyProgress;
  }

  try {
    const parsedProgress = JSON.parse(storedProgress) as SavedProgress;

    return {
      currentScenarioIndex:
        typeof parsedProgress.currentScenarioIndex === 'number' ? parsedProgress.currentScenarioIndex : null,
      generalComments: parsedProgress.generalComments ?? '',
      results: parsedProgress.results ?? {},
      lastSaved: parsedProgress.lastSaved ?? null
    };
  } catch {
    return emptyProgress;
  }
}

function getScenarioProgress(progress: SavedProgress, scenarioId: string): ScenarioProgress {
  return progress.results[scenarioId] ?? { status: '', comments: '' };
}

function hasRequiredComment(result: ScenarioProgress): boolean {
  return result.comments.trim().length > 0;
}

function getNavigationStatus(result: ScenarioProgress): NavigationStatus {
  if (!result.status && !hasRequiredComment(result)) {
    return 'Not started';
  }

  if (result.status === 'Pass') {
    return 'Completed';
  }

  if ((result.status === 'Fail' || result.status === 'Partially Passed') && hasRequiredComment(result)) {
    return 'Completed';
  }

  return 'In progress';
}

function isScenarioComplete(progress: SavedProgress, scenario: Scenario): boolean {
  return getNavigationStatus(getScenarioProgress(progress, scenario.id)) === 'Completed';
}

function formatSavedTime(isoValue: string | null): string {
  if (!isoValue) {
    return 'Not saved yet';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoValue));
}

function formatExportDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getCommentError(result: ScenarioProgress): string {
  if (result.status === 'Fail' && !hasRequiredComment(result)) {
    return 'A comment is required when a scenario is marked as Fail.';
  }

  if (result.status === 'Partially Passed' && !hasRequiredComment(result)) {
    return 'A comment is required when a scenario is marked as Partially Passed.';
  }

  return '';
}

function App() {
  const [progress, setProgress] = useState<SavedProgress>(getInitialProgress);
  const [pendingScenarioIndex, setPendingScenarioIndex] = useState<number | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [testerName, setTesterName] = useState('');
  const [showTesterNameError, setShowTesterNameError] = useState(false);
  const [showMovePrompt, setShowMovePrompt] = useState(false);
  const clearModalCancelRef = useRef<HTMLButtonElement>(null);
  const exportModalInputRef = useRef<HTMLInputElement>(null);
  const moveModalStayRef = useRef<HTMLButtonElement>(null);

  const selectedScenarioIndex = progress.currentScenarioIndex;
  const selectedScenario =
    selectedScenarioIndex === null ? null : scenarioPack.scenarios[selectedScenarioIndex] ?? null;
  const selectedResult = selectedScenario ? getScenarioProgress(progress, selectedScenario.id) : null;
  const completedCount = useMemo(
    () => scenarioPack.scenarios.filter((scenario) => isScenarioComplete(progress, scenario)).length,
    [progress]
  );
  const allScenariosComplete = completedCount === scenarioPack.scenarios.length && scenarioPack.scenarios.length > 0;
  const progressPercent =
    scenarioPack.scenarios.length === 0 ? 0 : Math.round((completedCount / scenarioPack.scenarios.length) * 100);

  useEffect(() => {
    if (isClearModalOpen) {
      clearModalCancelRef.current?.focus();
    }
  }, [isClearModalOpen]);

  useEffect(() => {
    if (isExportModalOpen) {
      exportModalInputRef.current?.focus();
    }
  }, [isExportModalOpen]);

  useEffect(() => {
    if (showMovePrompt) {
      moveModalStayRef.current?.focus();
    }
  }, [showMovePrompt]);

  function updateProgress(updater: (currentProgress: SavedProgress) => SavedProgress) {
    setProgress((currentProgress) => {
      const nextProgress = {
        ...updater(currentProgress),
        lastSaved: new Date().toISOString()
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
      return nextProgress;
    });
  }

  function updateScenarioResult(scenarioId: string, partialResult: Partial<ScenarioProgress>) {
    updateProgress((currentProgress) => {
      const currentResult = getScenarioProgress(currentProgress, scenarioId);

      return {
        ...currentProgress,
        results: {
          ...currentProgress.results,
          [scenarioId]: {
            ...currentResult,
            ...partialResult
          }
        }
      };
    });
  }

  function shouldPromptBeforeLeaving(): boolean {
    if (!selectedScenario || selectedResult?.status) {
      return false;
    }

    return true;
  }

  function requestScenarioChange(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= scenarioPack.scenarios.length || nextIndex === selectedScenarioIndex) {
      return;
    }

    if (shouldPromptBeforeLeaving()) {
      setPendingScenarioIndex(nextIndex);
      setShowMovePrompt(true);
      return;
    }

    selectScenario(nextIndex);
  }

  function selectScenario(nextIndex: number) {
    updateProgress((currentProgress) => ({
      ...currentProgress,
      currentScenarioIndex: nextIndex
    }));
  }

  function confirmMoveAway() {
    if (pendingScenarioIndex !== null) {
      selectScenario(pendingScenarioIndex);
    }

    setPendingScenarioIndex(null);
    setShowMovePrompt(false);
  }

  function stayOnScenario() {
    setPendingScenarioIndex(null);
    setShowMovePrompt(false);
  }

  function clearAllProgress() {
    window.localStorage.removeItem(STORAGE_KEY);
    setProgress(emptyProgress);
    setIsClearModalOpen(false);
  }

  async function exportPdf() {
    if (!testerName.trim()) {
      setShowTesterNameError(true);
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = 20;

    function addPageIfNeeded(requiredHeight: number) {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    }

    function addWrappedText(text: string, fontSize = 11, gap = 6) {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, contentWidth);
      addPageIfNeeded(lines.length * gap);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * gap;
    }

    doc.setFont('helvetica', 'bold');
    addWrappedText(scenarioPack.projectName, 18, 8);
    addWrappedText('UAT Results', 16, 8);

    doc.setFont('helvetica', 'normal');
    yPosition += 4;
    addWrappedText(`Tester: ${testerName.trim()}`);
    addWrappedText(`Exported: ${formatExportDate(new Date())}`);
    yPosition += 4;

    scenarioPack.scenarios.forEach((scenario) => {
      const result = getScenarioProgress(progress, scenario.id);
      addPageIfNeeded(22);
      doc.setFont('helvetica', 'bold');
      addWrappedText(`${scenario.id}: ${scenario.title}`, 12, 6);
      doc.setFont('helvetica', 'normal');
      addWrappedText(`Status: ${result.status}`);

      if (result.comments.trim()) {
        addWrappedText(`Comments: ${result.comments.trim()}`);
      }

      yPosition += 4;
    });

    if (progress.generalComments.trim()) {
      addPageIfNeeded(20);
      doc.setFont('helvetica', 'bold');
      addWrappedText('Any other comments:', 12, 6);
      doc.setFont('helvetica', 'normal');
      addWrappedText(progress.generalComments.trim());
    }

    doc.save(`${scenarioPack.projectName.replace(/\s+/g, '-').toLowerCase()}-uat-results.pdf`);
    setIsExportModalOpen(false);
    setTesterName('');
    setShowTesterNameError(false);
  }

  return (
    <main className="app">
      <div className="app__inner">
        <header className="page-header">
          <span className="service-name">UAT results capture</span>
          <h1>{scenarioPack.projectName}</h1>
          <p>
            Work through each scenario, record the result, and export a PDF when every scenario is complete.
            Your progress is saved automatically in this browser.
          </p>
        </header>

        <section className="toolbar" aria-label="Progress and actions">
          <div className="progress-summary">
            <p className="progress-summary__text">
              Progress: {completedCount} of {scenarioPack.scenarios.length} scenarios completed
            </p>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="save-status" aria-live="polite">
            Last saved: {formatSavedTime(progress.lastSaved)}
          </div>
          <div className="toolbar__actions">
            <button type="button" className="button button--secondary" onClick={() => setIsClearModalOpen(true)}>
              Clear progress
            </button>
            <button
              type="button"
              className="button"
              disabled={!allScenariosComplete}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export PDF
            </button>
          </div>
        </section>

        <section className="scenario-list" aria-labelledby="scenario-list-heading">
          <h2 id="scenario-list-heading">Scenarios</h2>
          <div className="scenario-list__items">
            {scenarioPack.scenarios.map((scenario, index) => {
              const navigationStatus = getNavigationStatus(getScenarioProgress(progress, scenario.id));
              const isSelected = selectedScenarioIndex === index;

              return (
                <button
                  type="button"
                  key={scenario.id}
                  className={`scenario-card scenario-card--${navigationStatus
                    .toLowerCase()
                    .replace(/\s+/g, '-')} ${isSelected ? 'scenario-card--selected' : ''}`}
                  onClick={() => requestScenarioChange(index)}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <span className="scenario-card__title">
                    {scenario.id} - {scenario.title}
                  </span>
                  <span className="scenario-card__summary">{scenario.summary}</span>
                  <span className="scenario-card__status">Status: {navigationStatus}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedScenario && selectedResult ? (
          <section className="scenario-detail" aria-labelledby="scenario-detail-heading">
            <p className="scenario-count">
              Scenario {selectedScenarioIndex! + 1} of {scenarioPack.scenarios.length}
            </p>
            <h2 id="scenario-detail-heading">
              {selectedScenario.id} - {selectedScenario.title}
            </h2>

            <div className="detail-block">
              <h3>Business Goal</h3>
              <p>{selectedScenario.businessGoal}</p>
            </div>

            <div className="detail-block">
              <h3>Pre-Condition</h3>
              <p>{selectedScenario.preCondition}</p>
            </div>

            <div className="detail-block">
              <h3>Scenario</h3>
              <p>
                <strong>Given</strong> {selectedScenario.scenario.given}
              </p>
              <p>
                <strong>When</strong> {selectedScenario.scenario.when}
              </p>
              {selectedScenario.scenario.and?.map((statement) => (
                <p key={statement}>
                  <strong>And</strong> {statement}
                </p>
              ))}
            </div>

            <div className="detail-block">
              <h3>Then / Expected Results</h3>
              <ul>
                {selectedScenario.scenario.then.map((expectedResult) => (
                  <li key={expectedResult}>{expectedResult}</li>
                ))}
              </ul>
            </div>

            <fieldset className="form-group">
              <legend>Result</legend>
              <div className="radio-group">
                {RESULT_STATUSES.map((status) => (
                  <label className="radio" key={status}>
                    <input
                      type="radio"
                      name={`result-${selectedScenario.id}`}
                      value={status}
                      checked={selectedResult.status === status}
                      onChange={() => updateScenarioResult(selectedScenario.id, { status })}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={`form-group ${getCommentError(selectedResult) ? 'form-group--error' : ''}`}>
              <label htmlFor={`comments-${selectedScenario.id}`}>Comments</label>
              {getCommentError(selectedResult) ? (
                <p className="error-message" id={`comments-error-${selectedScenario.id}`}>
                  {getCommentError(selectedResult)}
                </p>
              ) : null}
              <textarea
                id={`comments-${selectedScenario.id}`}
                rows={5}
                value={selectedResult.comments}
                aria-describedby={
                  getCommentError(selectedResult) ? `comments-error-${selectedScenario.id}` : undefined
                }
                onChange={(event) => updateScenarioResult(selectedScenario.id, { comments: event.target.value })}
              />
            </div>

            <div className="scenario-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={selectedScenarioIndex === 0}
                onClick={() => requestScenarioChange(selectedScenarioIndex! - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="button button--secondary"
                disabled={selectedScenarioIndex === scenarioPack.scenarios.length - 1}
                onClick={() => requestScenarioChange(selectedScenarioIndex! + 1)}
              >
                Next
              </button>
            </div>
          </section>
        ) : (
          <section className="empty-detail" aria-label="Select a scenario">
            <p>Select a scenario to view the details and record the result.</p>
          </section>
        )}

        <section className="general-comments" aria-labelledby="general-comments-heading">
          <h2 id="general-comments-heading">Any other comments</h2>
          <textarea
            id="general-comments"
            rows={5}
            value={progress.generalComments}
            onChange={(event) =>
              updateProgress((currentProgress) => ({
                ...currentProgress,
                generalComments: event.target.value
              }))
            }
          />
        </section>
      </div>

      {showMovePrompt ? (
        <Modal title="Move away from this scenario" onClose={stayOnScenario}>
          <p>
            You have not marked this scenario as Pass, Fail, or Partially Passed. Are you sure you want to move away
            from this scenario?
          </p>
          <div className="modal__actions">
            <button type="button" className="button button--secondary" ref={moveModalStayRef} onClick={stayOnScenario}>
              Stay on this scenario
            </button>
            <button type="button" className="button" onClick={confirmMoveAway}>
              Move away
            </button>
          </div>
        </Modal>
      ) : null}

      {isClearModalOpen ? (
        <Modal title="Clear progress" onClose={() => setIsClearModalOpen(false)}>
          <p>Are you sure you want to clear all your progress, all fields will be cleared</p>
          <div className="modal__actions">
            <button
              type="button"
              className="button button--secondary"
              ref={clearModalCancelRef}
              onClick={() => setIsClearModalOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="button button--warning" onClick={clearAllProgress}>
              Clear all progress
            </button>
          </div>
        </Modal>
      ) : null}

      {isExportModalOpen ? (
        <Modal
          title="Export UAT Results"
          onClose={() => {
            setIsExportModalOpen(false);
            setShowTesterNameError(false);
          }}
        >
          <div className={`form-group ${showTesterNameError ? 'form-group--error' : ''}`}>
            <label htmlFor="tester-name">Tester name</label>
            {showTesterNameError ? (
              <p className="error-message" id="tester-name-error">
                Enter the tester name.
              </p>
            ) : null}
            <input
              id="tester-name"
              ref={exportModalInputRef}
              type="text"
              value={testerName}
              aria-describedby={showTesterNameError ? 'tester-name-error' : undefined}
              onChange={(event) => {
                setTesterName(event.target.value);
                setShowTesterNameError(false);
              }}
            />
          </div>
          <div className="modal__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setIsExportModalOpen(false);
                setShowTesterNameError(false);
              }}
            >
              Cancel
            </button>
            <button type="button" className="button" onClick={exportPdf}>
              Export PDF
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

function Modal({ children, onClose, title }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          Close
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default App;
