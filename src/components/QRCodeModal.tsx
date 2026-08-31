import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, Printer } from 'lucide-react';

interface QRCodeModalProps {
  meetingId: string;
  meetingTitle: string;
  meetingPin: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  meetingId,
  meetingTitle,
  meetingPin,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const attendanceUrl = `${window.location.origin}/attend/${meetingId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(attendanceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrint = () => {
    const svgElement = document.querySelector('#qr-svg-source svg') || document.querySelector('.qr-modal-svg svg');
    const svgHtml = svgElement ? svgElement.outerHTML : '';
    const logoUrl = `${window.location.origin}/kenhalogo.png`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attendance Registration - ${meetingTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              text-align: center;
              padding: 20px 40px;
              color: #111827;
              background: #ffffff;
              margin: 0;
            }
            .poster-container {
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 3px solid #F9D616;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .logo-img {
              height: 75px;
              max-width: 160px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            .logo-text {
              font-size: 17px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #000000;
              margin: 0;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 12px;
              color: #4B5563;
              margin-top: 3px;
              font-style: italic;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: #111827;
              margin: 16px 0 6px 0;
              line-height: 1.3;
            }
            .scan-instructions {
              font-size: 14px;
              color: #4B5563;
              margin: 0 0 20px 0;
            }
            .qr-container {
              margin: 8px auto 20px;
              padding: 16px;
              border: 2px solid #E5E7EB;
              border-radius: 16px;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .qr-container svg {
              display: block;
              width: 220px !important;
              height: 220px !important;
            }
            .pin-section {
              margin: 10px 0 18px;
            }
            .pin-label {
              font-size: 12px;
              color: #4B5563;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 6px;
              font-weight: 700;
            }
            .pin-box {
              background: #F3F4F6;
              border: 2px dashed #9CA3AF;
              border-radius: 8px;
              padding: 12px 28px;
              display: inline-block;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #111827;
            }
            .instructions {
              max-width: 440px;
              margin: 16px auto 0;
              font-size: 13px;
              line-height: 1.6;
              color: #374151;
              text-align: left;
              background: #F9FAFB;
              padding: 14px 20px;
              border-radius: 8px;
              border: 1px solid #E5E7EB;
            }
            .instructions strong {
              display: block;
              margin-bottom: 6px;
              font-size: 13px;
              color: #111827;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="poster-container">
            <div class="header">
              <img src="${logoUrl}" alt="KeNHA Logo" class="logo-img" />
              <div class="logo-text">Kenya National Highways Authority</div>
              <div class="subtitle">Quality Highways, Better Connections</div>
            </div>

            <div class="title">${meetingTitle}</div>
            <p class="scan-instructions">Scan the QR code below using your mobile device to register attendance.</p>
            
            <div class="qr-container">
              ${svgHtml}
            </div>
            
            <div class="pin-section">
              <div class="pin-label">Required Meeting PIN</div>
              <div class="pin-box">${meetingPin}</div>
            </div>
            
            <div class="instructions">
              <strong>Instructions:</strong>
              1. Open your camera or QR code scanner.<br/>
              2. Point your device at the QR code above.<br/>
              3. Enter the Meeting PIN when prompted.<br/>
              4. Fill out the digital form and provide your signature.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content qr-modal">
        <div className="modal-header">
          <h3>Attendance Registration Details</h3>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body qr-modal-body">
          <div className="meeting-info-header">
            <span className="info-badge">Meeting Details</span>
            <h4>{meetingTitle}</h4>
          </div>

          <div className="qr-section">
            <div className="qr-modal-svg">
              {/* Keep this container identifiable with qr-svg-source for printing */}
              <div id="qr-svg-source">
                <QRCodeSVG
                  value={attendanceUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="48" ry="48" fill="%23000000"/><text x="50" y="58" font-family="sans-serif" font-weight="bold" font-size="24" fill="%23FFFFFF" text-anchor="middle">KeNHA</text></svg>',
                    x: undefined,
                    y: undefined,
                    height: 38,
                    width: 38,
                    excavate: true,
                  }}
                />
              </div>
            </div>
            <p className="qr-scan-label">Scan to register attendance</p>
          </div>

          <div className="pin-section">
            <span className="pin-label">Required Security PIN</span>
            <div className="pin-display">{meetingPin}</div>
            <p className="pin-help-text">Participants must enter this PIN after scanning the QR code.</p>
          </div>

          <div className="link-section">
            <span className="link-label">Direct Attendance URL</span>
            <div className="copy-link-box">
              <span className="copy-link-text">{attendanceUrl}</span>
              <button 
                type="button" 
                onClick={copyToClipboard}
                className={`copy-btn ${copied ? 'copied' : ''}`}
                title="Copy Link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer qr-modal-footer">
          <button 
            type="button" 
            onClick={handlePrint}
            className="btn btn-secondary print-qr-btn"
          >
            <Printer size={16} className="btn-icon" />
            Print QR Poster
          </button>
          <a 
            href={attendanceUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary test-link-btn"
          >
            <ExternalLink size={16} className="btn-icon" />
            Open Attendance Form
          </a>
        </div>
      </div>
    </div>
  );
};
