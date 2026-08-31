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
    const logoUrl = `${window.location.origin}/kenha_banner_logo.png`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title></title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              text-align: center;
              padding: 14mm 16mm;
              color: #111827;
              background: #ffffff;
            }
            .poster-container {
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 3px solid #F9D616;
              padding-bottom: 16px;
              margin-bottom: 22px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .logo-banner-img {
              max-width: 480px;
              width: 95%;
              height: auto;
              object-fit: contain;
              display: block;
              border-radius: 4px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: #111827;
              margin: 16px 0 8px 0;
              line-height: 1.3;
              text-transform: uppercase;
            }
            .scan-instructions {
              font-size: 15px;
              font-weight: 700;
              color: #111827;
              margin: 0 0 16px 0;
              line-height: 1.4;
            }
            .qr-container {
              margin: 6px auto 16px;
              padding: 16px;
              border: 2.5px solid #111827;
              border-radius: 16px;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
            }
            .qr-container svg {
              display: block;
              width: 220px !important;
              height: 220px !important;
            }
            .pin-section {
              margin: 8px 0 16px;
            }
            .pin-label {
              font-size: 12.5px;
              color: #374151;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 6px;
              font-weight: 800;
            }
            .pin-box {
              background: #F3F4F6;
              border: 2px dashed #4B5563;
              border-radius: 8px;
              padding: 10px 28px;
              display: inline-block;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #111827;
            }
            .instructions {
              max-width: 480px;
              margin: 16px auto 0;
              font-size: 13.5px;
              font-weight: 700;
              line-height: 1.7;
              color: #111827;
              text-align: left;
              background: #F9FAFB;
              padding: 14px 22px;
              border-radius: 10px;
              border: 2px solid #D1D5DB;
            }
            .instructions-heading {
              font-weight: 800;
              font-size: 14px;
              color: #000000;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .instructions-list {
              margin: 0;
              padding-left: 20px;
              font-weight: 700;
              color: #1f2937;
            }
            .instructions-list li {
              margin-bottom: 4px;
              font-weight: 700;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 10mm 14mm !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="poster-container">
            <div class="header">
              <img src="${logoUrl}" alt="Kenya National Highways Authority" class="logo-banner-img" />
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
              <div class="instructions-heading">Instructions:</div>
              <ol class="instructions-list">
                <li>Open your camera or QR code scanner.</li>
                <li>Point your device at the QR code above.</li>
                <li>Enter the Meeting PIN when prompted.</li>
                <li>Fill out the digital form and provide your signature.</li>
              </ol>
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
