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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Registration - ${meetingTitle}</title>
          <style>
            body {
              font-family: 'Segoe UI', system-ui, sans-serif;
              text-align: center;
              padding: 40px;
              color: #111827;
            }
            .header {
              border-bottom: 2px solid #F9D616;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 32px;
              font-weight: 800;
              letter-spacing: 2px;
              color: #000;
              margin: 0;
            }
            .subtitle {
              font-size: 14px;
              color: #4B5563;
              margin-top: 5px;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              margin: 20px 0 10px 0;
            }
            .qr-container {
              margin: 30px auto;
              padding: 20px;
              border: 1px solid #E5E7EB;
              border-radius: 12px;
              display: inline-block;
              background: white;
            }
            .pin-box {
              background: #F3F4F6;
              border: 2px dashed #9CA3AF;
              border-radius: 8px;
              padding: 15px 30px;
              display: inline-block;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: 4px;
              margin: 20px 0;
            }
            .pin-label {
              font-size: 12px;
              color: #4B5563;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 5px;
              font-weight: 600;
            }
            .instructions {
              max-width: 400px;
              margin: 20px auto;
              font-size: 14px;
              line-height: 1.5;
              color: #374151;
            }
            .footer-url {
              font-family: monospace;
              font-size: 12px;
              color: #6B7280;
              word-break: break-all;
              margin-top: 30px;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo-text">KeNHA</h1>
            <div class="subtitle">Kenya National Highways Authority</div>
          </div>
          <div class="title">${meetingTitle}</div>
          <p style="color: #4B5563;">Scan the QR code below using your mobile device to register attendance.</p>
          
          <div class="qr-container" id="qr-target"></div>
          
          <div>
            <div class="pin-label">Required Meeting PIN</div>
            <div class="pin-box">${meetingPin}</div>
          </div>
          
          <div class="instructions">
            <strong>Instructions:</strong><br/>
            1. Open your camera or QR code scanner.<br/>
            2. Point your device at the QR code above.<br/>
            3. Enter the Meeting PIN when prompted.<br/>
            4. Fill out the digital form and provide your signature.
          </div>
          
          <div class="footer-url">${attendanceUrl}</div>

          <script>
            // Render QR code inside print window using simple image or SVG clone from parent
            const svgContent = document.getElementById('qr-svg-source').outerHTML;
            document.getElementById('qr-target').innerHTML = svgContent;
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    
    // Inject the SVG source for printing
    const svgElement = document.querySelector('.qr-modal-svg svg');
    if (svgElement && printWindow.document.getElementById('qr-svg-source')) {
      // SVG exists, print window script will pick it up
    } else if (printWindow) {
      // Fallback injection of SVG directly
      const svgHtml = svgElement ? svgElement.outerHTML : '';
      printWindow.document.write(`
        <div style="display:none">
          <div id="qr-svg-source">${svgHtml}</div>
        </div>
      `);
      printWindow.document.close();
    }
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
