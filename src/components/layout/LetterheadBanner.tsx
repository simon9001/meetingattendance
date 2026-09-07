import React from 'react';

interface LetterheadBannerProps {
  /**
   * `full` shows the address strip beneath the black bar (letterhead proper).
   * `compact` shows the bar alone — used in app chrome, where vertical space
   * is at a premium and the address adds nothing to a signed-in user.
   */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * The official KeNHA letterhead, matching the printed register's header in
 * registerDocument.ts: black bar, the KeNHA mark, the authority name, the gold
 * tagline, and (optionally) the address strip.
 *
 * The mark is /kenhalogo.png, a square image with a wide white ground. It is
 * clipped to the ellipse measured from its own pixels — the same clip-path the
 * print header uses — so the white ground drops away against the black bar
 * without needing a separate transparent asset.
 */
export const LetterheadBanner: React.FC<LetterheadBannerProps> = ({
  variant = 'full',
  className = '',
}) => (
  <div className={`letterhead ${className}`}>
    <div className="letterhead-bar">
      <span className="letterhead-mark-frame">
        <img
          src="/kenhalogo.png"
          // Decorative: the authority name sits beside it as real text.
          alt=""
          aria-hidden="true"
          className="letterhead-mark"
          width={76}
          height={76}
        />
      </span>
      <div className="letterhead-lockup">
        <span className="letterhead-name">Kenya National Highways Authority</span>
        <span className="letterhead-rule" aria-hidden="true" />
        <span className="letterhead-tagline">Quality Highways, Better Connections</span>
      </div>
    </div>

    {variant === 'full' && (
      <div className="letterhead-address">
        <div>
          <strong>Barabara Plaza, Block A &amp; C,</strong> Jomo Kenyatta International
          Airport (JKIA), Off Airport South Road, along Mazao Road,
        </div>
        <div>
          <strong>P.O Box</strong> 49712 - 00100 Nairobi, <strong>Tel</strong> 020 - 4954000
          {' / '}0700 423 606 <strong>Email</strong> dg@kenha.co.ke{' / '}
          <strong>Website</strong> www.kenha.co.ke
        </div>
      </div>
    )}
  </div>
);
