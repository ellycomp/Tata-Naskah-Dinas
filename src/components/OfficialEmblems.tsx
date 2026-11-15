import React from 'react';
import { BuiltInLogoId } from '../types/letter';

interface EmblemProps {
  logoId: BuiltInLogoId;
  color?: string;
  size?: number;
}

export const OfficialEmblem: React.FC<EmblemProps> = ({
  logoId,
  color = '#1e3a5f',
  size = 64,
}) => {
  if (logoId === 'none') return null;

  if (logoId === 'shield') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Lambang Instansi Pemerintahan"
      >
        <path
          d="M40 6L68 16V38C68 55.5 56 68.5 40 74C24 68.5 12 55.5 12 38V16L40 6Z"
          stroke={color}
          strokeWidth="3"
          fill="#ffffff"
        />
        <path
          d="M40 12L62 20V37.5C62 51.8 52.3 62.6 40 67.5C27.7 62.6 18 51.8 18 37.5V20L40 12Z"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M40 21L43.5 31.2H54.2L45.6 37.5L48.8 47.8L40 41.5L31.2 47.8L34.4 37.5L25.8 31.2H36.5L40 21Z"
          fill={color}
        />
        <path
          d="M27 54C31.5 56.5 35.8 57.5 40 57.5C44.2 57.5 48.5 56.5 53 54"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (logoId === 'corporate') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo Perusahaan"
      >
        <rect x="8" y="8" width="64" height="64" rx="10" fill={color} />
        <path d="M22 56V24H33L46 43V24H58V56H47L34 37V56H22Z" fill="#ffffff" />
      </svg>
    );
  }

  if (logoId === 'academic') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Lambang Lembaga Pendidikan"
      >
        <circle cx="40" cy="40" r="33" stroke={color} strokeWidth="2.8" fill="#ffffff" />
        <circle cx="40" cy="40" r="28" stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
        <path
          d="M40 16L18 26.5L40 37L62 26.5L40 16Z"
          fill={color}
        />
        <path
          d="M26 33V47C26 51.5 32.3 55.5 40 55.5C47.7 55.5 54 51.5 54 47V33"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M60 28V43" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="60" cy="45" r="2.2" fill={color} />
      </svg>
    );
  }

  // organization
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lambang Organisasi"
    >
      <circle cx="40" cy="40" r="32" stroke={color} strokeWidth="3" fill="#ffffff" />
      <path
        d="M40 15C46 25 56 30 63 32C56 38 52 48 53 59C45 54 35 54 27 59C28 48 24 38 17 32C24 30 34 25 40 15Z"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
      />
      <circle cx="40" cy="40" r="7" fill={color} />
    </svg>
  );
};

interface OfficialStampProps {
  topText: string;
  centerText: string;
  color?: string;
  size?: number;
}

export const OfficialStamp: React.FC<OfficialStampProps> = ({
  topText,
  centerText,
  color = '#1e3a8a',
  size = 126,
}) => {
  const safeTop = (topText || 'INSTANSI RESMI').toUpperCase().slice(0, 34);
  const safeCenter = (centerText || 'RESMI').toUpperCase().slice(0, 18);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.82 }}
      aria-label="Stempel Resmi"
    >
      <defs>
        <path id="stampTopArc" d="M 22,70 A 48,48 0 1,1 118,70" />
        <path id="stampBottomArc" d="M 118,72 A 48,48 0 1,1 22,72" />
      </defs>
      <circle cx="70" cy="70" r="64" stroke={color} strokeWidth="2.6" fill="none" />
      <circle cx="70" cy="70" r="59" stroke={color} strokeWidth="1" fill="none" />
      <circle cx="70" cy="70" r="36" stroke={color} strokeWidth="1.6" fill="none" />

      <text
        fill={color}
        fontSize="9.2"
        fontWeight="700"
        letterSpacing="1.1"
        fontFamily="Arial, sans-serif"
      >
        <textPath href="#stampTopArc" startOffset="50%" textAnchor="middle">
          {safeTop}
        </textPath>
      </text>

      <text
        fill={color}
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="1.2"
        fontFamily="Arial, sans-serif"
      >
        <textPath href="#stampBottomArc" startOffset="50%" textAnchor="middle">
          • TATA NASKAH RESMI •
        </textPath>
      </text>

      <line x1="36" y1="60" x2="104" y2="60" stroke={color} strokeWidth="1.2" />
      <text
        x="70"
        y="74"
        fill={color}
        fontSize="10.5"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        {safeCenter}
      </text>
      <line x1="36" y1="80" x2="104" y2="80" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};
