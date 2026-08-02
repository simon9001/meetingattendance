import React from 'react';
import { CheckCircle2, AlertTriangle, Info, FileText, Image, LayoutPanelTop, LayoutPanelLeft } from 'lucide-react';
import { TemplateMeta } from '../../features/apis/documentsApi';

interface TemplatePreviewerProps {
  metadata: TemplateMeta | null;
}

export const TemplatePreviewer: React.FC<TemplatePreviewerProps> = ({ metadata }) => {
  if (!metadata) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-base-content/50 bg-base-200 rounded-xl">
        <Info size={32} className="mb-2" />
        <p>No template metadata available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-base-200 p-4 rounded-xl flex items-center gap-3">
          <LayoutPanelTop className="text-primary" size={24} />
          <div>
            <div className="text-sm text-base-content/60">Headers</div>
            <div className="text-lg font-bold">{metadata.headers}</div>
          </div>
        </div>
        <div className="bg-base-200 p-4 rounded-xl flex items-center gap-3">
          <LayoutPanelLeft className="text-primary" size={24} />
          <div>
            <div className="text-sm text-base-content/60">Footers</div>
            <div className="text-lg font-bold">{metadata.footers}</div>
          </div>
        </div>
        <div className="bg-base-200 p-4 rounded-xl flex items-center gap-3">
          <FileText className="text-primary" size={24} />
          <div>
            <div className="text-sm text-base-content/60">Tables</div>
            <div className="text-lg font-bold">{metadata.tables}</div>
          </div>
        </div>
        <div className="bg-base-200 p-4 rounded-xl flex items-center gap-3">
          <Image className="text-primary" size={24} />
          <div>
            <div className="text-sm text-base-content/60">Images</div>
            <div className="text-lg font-bold">{metadata.images}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4">
            <h4 className="card-title text-sm flex items-center gap-2 text-success">
              <CheckCircle2 size={18} />
              Recognized Placeholders ({metadata.placeholders?.length || 0})
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.placeholders?.length > 0 ? (
                metadata.placeholders.map((p, i) => (
                  <span key={i} className="badge badge-success badge-sm">{p}</span>
                ))
              ) : (
                <span className="text-sm text-base-content/50">None</span>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4">
            <h4 className="card-title text-sm flex items-center gap-2 text-warning">
              <AlertTriangle size={18} />
              Unknown Placeholders ({metadata.unknownPlaceholders?.length || 0})
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.unknownPlaceholders?.length > 0 ? (
                metadata.unknownPlaceholders.map((p, i) => (
                  <span key={i} className="badge badge-warning badge-sm">{p}</span>
                ))
              ) : (
                <span className="text-sm text-base-content/50">None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {metadata.warnings?.length > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={18} />
          <div>
            <h3 className="font-bold text-sm">Warnings</h3>
            <ul className="list-disc pl-4 text-xs mt-1 space-y-1">
              {metadata.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
