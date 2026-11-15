import React, { useEffect, useMemo, useState } from 'react';
import { LetterDocument } from '../types/letter';
import {
  createDefaultGiverParty,
  createDefaultRecipientParty,
  createDefaultSkData,
  resolveLetterKind,
} from '../data/presets';
import { buildLetterShareUrl, generateQrCodeDataUrl } from '../utils/qrSignature';
import { OfficialEmblem, OfficialStamp } from './OfficialEmblems';

interface LetterPreviewProps {
  doc: LetterDocument;
  zoom?: number;
  isExporting?: boolean;
}

export const PAPER_DIMENSIONS = {
  A4: { widthMm: 210, heightMm: 297 },
  F4: { widthMm: 215, heightMm: 330 },
} as const;

const MARGIN_MM = {
  standard: { top: 18, right: 20, bottom: 20, left: 24 },
  compact: { top: 14, right: 16, bottom: 16, left: 18 },
  wide: { top: 22, right: 25, bottom: 24, left: 28 },
} as const;

const FONT_FAMILIES = {
  times: '"Times New Roman", "Source Serif 4", Georgia, serif',
  arial: 'Arial, Helvetica, sans-serif',
  georgia: 'Georgia, "Source Serif 4", serif',
} as const;

export const LetterPreview: React.FC<LetterPreviewProps> = ({
  doc,
  zoom = 1,
  isExporting = false,
}) => {
  const { widthMm, heightMm } = PAPER_DIMENSIONS[doc.paperSize];
  const margins = MARGIN_MM[doc.marginPreset];
  const fontFamily = FONT_FAMILIES[doc.fontFamily];
  const kop = doc.letterhead;

  const leftSize = kop.leftLogoSize || 68;
  const rightSize = kop.rightLogoSize || 68;
  const letterKind = resolveLetterKind(doc);
  const stampScaleRatio = (doc.stampScale ?? 100) / 100;
  const signatureMode = doc.signatureMode || 'manual';
  const qrSourceMode = doc.qrSourceMode || 'auto-link';
  const qrSize = doc.qrSize ?? 76;
  const qrShowCaption = doc.qrShowCaption ?? true;

  const [autoQrDataUrl, setAutoQrDataUrl] = useState<string>('');
  const shareUrl = useMemo(
    () => (signatureMode !== 'manual' && qrSourceMode === 'auto-link' ? buildLetterShareUrl(doc) : ''),
    [doc, signatureMode, qrSourceMode]
  );

  useEffect(() => {
    if (!shareUrl) {
      setAutoQrDataUrl('');
      return;
    }
    let cancelled = false;
    generateQrCodeDataUrl(shareUrl, 240, '#0f172a')
      .then((url) => {
        if (!cancelled) setAutoQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setAutoQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const activeQrSrc =
    qrSourceMode === 'custom-upload' ? doc.customQrDataUrl || '' : autoQrDataUrl;

  const renderStampVisual = () => {
    if (!doc.showStamp) return null;
    if (doc.stampMode === 'custom-png' && doc.customStampDataUrl) {
      const pngSize = Math.round(112 * stampScaleRatio);
      return (
        <img
          src={doc.customStampDataUrl}
          alt="Stempel Resmi PNG"
          referrerPolicy="no-referrer"
          style={{
            width: `${pngSize}px`,
            height: `${pngSize}px`,
            objectFit: 'contain',
            opacity: 0.9,
            display: 'block',
          }}
        />
      );
    }
    return (
      <OfficialStamp
        topText={doc.stampTextTop || kop.orgName}
        centerText={doc.stampTextCenter || doc.city || 'RESMI'}
        color={doc.stampColor || '#1e3a8a'}
        size={Math.round(126 * stampScaleRatio)}
      />
    );
  };

  const renderSignatureZone = () => {
    const showManual = signatureMode === 'manual' || signatureMode === 'both';
    const showQr = (signatureMode === 'qr' || signatureMode === 'both') && Boolean(activeQrSrc);
    const showManualBox = Boolean(doc.showManualSignatureBox);
    const zoneMinHeight = showQr ? `${Math.max(82, qrSize + (qrShowCaption ? 22 : 10))}px` : '82px';

    return (
      <div
        style={{
          minHeight: zoneMinHeight,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingTop: '4px',
          paddingBottom: '4px',
        }}
      >
        {doc.showStamp && (
          <div
            style={{
              position: 'absolute',
              left: '-48px',
              top: '-18px',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {renderStampVisual()}
          </div>
        )}

        {showQr && (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginLeft: '4px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '3px',
                border: '1px solid #e2e8f0',
                display: 'inline-block',
              }}
            >
              <img
                src={activeQrSrc}
                alt="QR-Code Tanda Tangan Elektronik"
                referrerPolicy="no-referrer"
                style={{
                  width: `${qrSize}px`,
                  height: `${qrSize}px`,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            {qrShowCaption && (
              <div
                style={{
                  fontSize: '6.8pt',
                  color: '#475569',
                  lineHeight: 1.2,
                  marginTop: '2px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Ditandatangani secara elektronik
              </div>
            )}
          </div>
        )}

        {showManual && doc.signatureDataUrl && (
          showManualBox ? (
            <div
              style={{
                width: showQr ? '130px' : '190px',
                minHeight: '72px',
                border: '1px solid #94a3b8',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <img
                src={doc.signatureDataUrl}
                alt="Tanda Tangan"
                referrerPolicy="no-referrer"
                style={{
                  maxHeight: `${Math.round(62 * (doc.signatureScale / 100))}px`,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <img
              src={doc.signatureDataUrl}
              alt="Tanda Tangan"
              referrerPolicy="no-referrer"
              style={{
                maxHeight: `${Math.round(68 * (doc.signatureScale / 100))}px`,
                maxWidth: showQr ? '130px' : '190px',
                objectFit: 'contain',
                position: 'relative',
                zIndex: 2,
                marginLeft: showQr ? '0px' : '10px',
              }}
            />
          )
        )}

        {showManual && !doc.signatureDataUrl && showManualBox && (
          <div
            style={{
              width: showQr ? '130px' : '190px',
              height: '72px',
              border: '1px dashed #64748b',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.72)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: '8pt',
                color: '#94a3b8',
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '0.3px',
              }}
            >
              Tanda Tangan
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderPartyRows = (
    rows: { label: string; value: string }[],
    marginBottom = '10px'
  ) => (
    <table
      style={{
        width: 'calc(100% - 20px)',
        borderCollapse: 'collapse',
        margin: `4px 0 ${marginBottom} 20px`,
      }}
    >
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            <td
              style={{
                width: '175px',
                verticalAlign: 'top',
                padding: '2px 6px 2px 0',
              }}
            >
              {row.label}
            </td>
            <td style={{ width: '14px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
            <td
              style={{
                verticalAlign: 'top',
                padding: '2px 0',
                fontWeight: idx === 0 ? 600 : 400,
                whiteSpace: 'pre-line',
              }}
            >
              {row.value || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderLeftLogo = () => {
    if (kop.customLogoDataUrl) {
      return (
        <img
          src={kop.customLogoDataUrl}
          alt="Lambang Kiri"
          referrerPolicy="no-referrer"
          style={{
            width: `${leftSize}px`,
            height: `${leftSize}px`,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      );
    }
    if (kop.builtInLogo !== 'none') {
      return <OfficialEmblem logoId={kop.builtInLogo} color={kop.accentColor} size={leftSize} />;
    }
    return null;
  };

  const renderRightLogo = () => {
    if (!kop.showRightLogo && kop.layout !== 'dual-center') return null;
    if (kop.rightLogoDataUrl) {
      return (
        <img
          src={kop.rightLogoDataUrl}
          alt="Lambang Kanan"
          referrerPolicy="no-referrer"
          style={{
            width: `${rightSize}px`,
            height: `${rightSize}px`,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      );
    }
    const rightEmblem = kop.rightBuiltInLogo ?? kop.builtInLogo;
    if (rightEmblem && rightEmblem !== 'none') {
      return <OfficialEmblem logoId={rightEmblem} color={kop.accentColor} size={rightSize} />;
    }
    return null;
  };

  const leftLogoNode = renderLeftLogo();
  const rightLogoNode = renderRightLogo();
  const isLeftAligned = kop.layout === 'left-left';

  const renderDivider = () => {
    if (kop.dividerStyle === 'double-official') {
      return (
        <div style={{ marginTop: '8px', marginBottom: '16px' }}>
          <div style={{ height: '3px', backgroundColor: kop.accentColor || '#0f172a' }} />
          <div
            style={{
              height: '1px',
              backgroundColor: kop.accentColor || '#0f172a',
              marginTop: '2px',
            }}
          />
        </div>
      );
    }
    if (kop.dividerStyle === 'single-bold') {
      return (
        <div
          style={{
            marginTop: '8px',
            marginBottom: '16px',
            height: '2.5px',
            backgroundColor: kop.accentColor || '#0f172a',
          }}
        />
      );
    }
    return (
      <div
        style={{
          marginTop: '10px',
          marginBottom: '16px',
          height: '2px',
          backgroundColor: kop.accentColor || '#1e3a5f',
        }}
      />
    );
  };

  // Scale wrapper dimensions so layout occupies exact scaled box without whitespace gaps
  const pxPerMm = 3.7795275591;
  const sheetWidthPx = widthMm * pxPerMm;
  const sheetMinHeightPx = heightMm * pxPerMm;

  return (
    <div
      className="print-scale-wrapper"
      style={
        isExporting
          ? { width: `${widthMm}mm` }
          : {
              width: `${sheetWidthPx * zoom}px`,
              minHeight: `${sheetMinHeightPx * zoom}px`,
              position: 'relative',
            }
      }
    >
      <div
        id="printable-letter-sheet"
        style={{
          width: `${widthMm}mm`,
          minHeight: `${heightMm}mm`,
          paddingTop: `${margins.top}mm`,
          paddingRight: `${margins.right}mm`,
          paddingBottom: `${margins.bottom}mm`,
          paddingLeft: `${margins.left}mm`,
          backgroundColor: '#ffffff',
          color: '#111827',
          fontFamily,
          fontSize: `${doc.fontSizePt}pt`,
          lineHeight: 1.48,
          boxSizing: 'border-box',
          position: 'relative',
          transform: isExporting ? 'none' : `scale(${zoom})`,
          transformOrigin: 'top left',
          boxShadow: isExporting ? 'none' : '0 10px 30px rgba(15, 23, 42, 0.14)',
        }}
      >
        {/* Page-break visual guide for 1st page limit */}
        {!isExporting && (
          <div
            className="page-break-guide no-print"
            style={{
              position: 'absolute',
              top: `${heightMm}mm`,
              left: 0,
              right: 0,
              borderTop: '1px dashed #cbd5e1',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                right: '8px',
                top: '-10px',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontSize: '9px',
                fontFamily: 'Arial, sans-serif',
                padding: '1px 6px',
                border: '1px solid #e2e8f0',
                borderRadius: '3px',
              }}
            >
              Batas Halaman 1 ({doc.paperSize})
            </span>
          </div>
        )}

        {/* KOP SURAT RESMI */}
        <header style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isLeftAligned ? 'flex-start' : 'space-between',
              gap: '14px',
            }}
          >
            {leftLogoNode && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {leftLogoNode}
              </div>
            )}

            <div
              style={{
                flex: 1,
                textAlign: isLeftAligned ? 'left' : 'center',
              }}
            >
              {kop.parentOrg.trim() && (
                <div
                  style={{
                    fontSize: '10.5pt',
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                    color: '#111827',
                    lineHeight: 1.25,
                    textTransform: 'uppercase',
                  }}
                >
                  {kop.parentOrg}
                </div>
              )}

              <div
                style={{
                  fontSize: '14.5pt',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  color: kop.dividerStyle === 'accent-line' ? kop.accentColor : '#0f172a',
                  lineHeight: 1.2,
                  marginTop: kop.parentOrg.trim() ? '2px' : '0',
                  textTransform: 'uppercase',
                }}
              >
                {kop.orgName || 'NAMA INSTANSI / PERUSAHAAN'}
              </div>

              {kop.subUnit.trim() && (
                <div
                  style={{
                    fontSize: '10pt',
                    fontWeight: 600,
                    color: '#1f2937',
                    lineHeight: 1.25,
                    marginTop: '2px',
                  }}
                >
                  {kop.subUnit}
                </div>
              )}

              {kop.address.trim() && (
                <div
                  style={{
                    fontSize: '8.8pt',
                    color: '#374151',
                    lineHeight: 1.35,
                    marginTop: '3px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {kop.address}
                </div>
              )}

              {(() => {
                const mode =
                  kop.contactLastLineMode ||
                  (kop.websiteOnLastLine ? 'website-last' : 'inline');
                if (mode === 'website-last') {
                  return (
                    <>
                      {(kop.contactLine.trim() || kop.websiteEmailLine.trim()) && (
                        <div
                          style={{
                            fontSize: '8.5pt',
                            color: '#374151',
                            lineHeight: 1.35,
                          }}
                        >
                          {[kop.contactLine, kop.websiteEmailLine]
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                      {kop.websiteLine && kop.websiteLine.trim() && (
                        <div
                          style={{
                            fontSize: '8.5pt',
                            color: '#374151',
                            lineHeight: 1.35,
                          }}
                        >
                          {kop.websiteLine.trim()}
                        </div>
                      )}
                    </>
                  );
                }
                if (mode === 'email-last') {
                  return (
                    <>
                      {(kop.contactLine.trim() ||
                        (kop.websiteLine && kop.websiteLine.trim())) && (
                        <div
                          style={{
                            fontSize: '8.5pt',
                            color: '#374151',
                            lineHeight: 1.35,
                          }}
                        >
                          {[kop.contactLine, kop.websiteLine || '']
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                      {kop.websiteEmailLine.trim() && (
                        <div
                          style={{
                            fontSize: '8.5pt',
                            color: '#374151',
                            lineHeight: 1.35,
                          }}
                        >
                          {kop.websiteEmailLine.trim()}
                        </div>
                      )}
                    </>
                  );
                }
                return (
                  (kop.contactLine.trim() ||
                    (kop.websiteLine && kop.websiteLine.trim()) ||
                    kop.websiteEmailLine.trim()) && (
                    <div
                      style={{
                        fontSize: '8.5pt',
                        color: '#374151',
                        lineHeight: 1.35,
                      }}
                    >
                      {[kop.contactLine, kop.websiteLine || '', kop.websiteEmailLine]
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )
                );
              })()}
            </div>

            {!isLeftAligned && (
              <div
                style={{
                  flexShrink: 0,
                  width: rightLogoNode ? 'auto' : leftLogoNode ? `${leftSize}px` : '0px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {rightLogoNode}
              </div>
            )}
          </div>
          {renderDivider()}
        </header>

        {/* BAGIAN ISI KHUSUS SURAT KEPUTUSAN (SK) */}
        {letterKind === 'sk' ? (
          (() => {
            const sk = doc.skData || createDefaultSkData(kop, doc.dateString);
            return (
              <>
                <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '14px' }}>
                  <div
                    style={{
                      fontSize: `${doc.fontSizePt + 2}pt`,
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {doc.decreeTitle || 'SURAT KEPUTUSAN'}
                  </div>
                  <div style={{ marginTop: '3px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                    Nomor: {doc.letterNumber || '-'}
                  </div>
                  <div
                    style={{
                      marginTop: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    TENTANG
                  </div>
                  <div
                    style={{
                      marginTop: '2px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {sk.about}
                  </div>
                  {doc.openingParagraph.trim() && (
                    <div style={{ marginTop: '10px', fontWeight: 600 }}>
                      {doc.openingParagraph}
                    </div>
                  )}
                </div>

                {/* Konsiderans: Menimbang & Mengingat */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '12px',
                  }}
                >
                  <tbody>
                    {sk.considering.some((c) => c.trim()) && (
                      <tr>
                        <td
                          style={{
                            width: '105px',
                            verticalAlign: 'top',
                            padding: '3px 6px 6px 0',
                            fontWeight: 600,
                          }}
                        >
                          Menimbang
                        </td>
                        <td
                          style={{
                            width: '14px',
                            verticalAlign: 'top',
                            padding: '3px 0 6px 0',
                          }}
                        >
                          :
                        </td>
                        <td style={{ verticalAlign: 'top', padding: '3px 0 6px 0' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {sk.considering
                                .filter((c) => c.trim())
                                .map((item, idx) => (
                                  <tr key={idx}>
                                    <td
                                      style={{
                                        width: '22px',
                                        verticalAlign: 'top',
                                        padding: '0 4px 4px 0',
                                      }}
                                    >
                                      {String.fromCharCode(97 + idx)}.
                                    </td>
                                    <td
                                      style={{
                                        verticalAlign: 'top',
                                        textAlign: 'justify',
                                        paddingBottom: '4px',
                                      }}
                                    >
                                      {item}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}

                    {sk.legalBasis.some((l) => l.trim()) && (
                      <tr>
                        <td
                          style={{
                            width: '105px',
                            verticalAlign: 'top',
                            padding: '3px 6px 6px 0',
                            fontWeight: 600,
                          }}
                        >
                          Mengingat
                        </td>
                        <td
                          style={{
                            width: '14px',
                            verticalAlign: 'top',
                            padding: '3px 0 6px 0',
                          }}
                        >
                          :
                        </td>
                        <td style={{ verticalAlign: 'top', padding: '3px 0 6px 0' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {sk.legalBasis
                                .filter((l) => l.trim())
                                .map((item, idx) => (
                                  <tr key={idx}>
                                    <td
                                      style={{
                                        width: '22px',
                                        verticalAlign: 'top',
                                        padding: '0 4px 4px 0',
                                      }}
                                    >
                                      {idx + 1}.
                                    </td>
                                    <td
                                      style={{
                                        verticalAlign: 'top',
                                        textAlign: 'justify',
                                        paddingBottom: '4px',
                                      }}
                                    >
                                      {item}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* MEMUTUSKAN */}
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    margin: '10px 0 10px 0',
                    textTransform: 'uppercase',
                  }}
                >
                  {sk.decisionWord || 'MEMUTUSKAN'} :
                </div>

                {/* Menetapkan & Diktum */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '18px',
                  }}
                >
                  <tbody>
                    {sk.enactStatement.trim() && (
                      <tr>
                        <td
                          style={{
                            width: '105px',
                            verticalAlign: 'top',
                            padding: '3px 6px 8px 0',
                            fontWeight: 600,
                          }}
                        >
                          {sk.enactLabel || 'Menetapkan'}
                        </td>
                        <td
                          style={{
                            width: '14px',
                            verticalAlign: 'top',
                            padding: '3px 0 8px 0',
                          }}
                        >
                          :
                        </td>
                        <td
                          style={{
                            verticalAlign: 'top',
                            padding: '3px 0 8px 0',
                            fontWeight: 700,
                            textAlign: 'justify',
                          }}
                        >
                          {sk.enactStatement}
                        </td>
                      </tr>
                    )}

                    {sk.clauses.map((clause) => (
                      <tr key={clause.id}>
                        <td
                          style={{
                            width: '105px',
                            verticalAlign: 'top',
                            padding: '3px 6px 7px 0',
                            fontWeight: 600,
                          }}
                        >
                          {clause.label}
                        </td>
                        <td
                          style={{
                            width: '14px',
                            verticalAlign: 'top',
                            padding: '3px 0 7px 0',
                          }}
                        >
                          :
                        </td>
                        <td
                          style={{
                            verticalAlign: 'top',
                            padding: '3px 0 7px 0',
                            textAlign: 'justify',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {clause.text}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Penetapan & Tanda Tangan SK */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '14px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div style={{ width: '270px', position: 'relative', textAlign: 'left' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '100px', padding: '1px 0' }}>Ditetapkan di</td>
                          <td style={{ width: '12px', padding: '1px 0' }}>:</td>
                          <td style={{ padding: '1px 0' }}>
                            {sk.establishedIn || doc.city || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0' }}>Pada tanggal</td>
                          <td style={{ padding: '1px 0' }}>:</td>
                          <td style={{ padding: '1px 0' }}>
                            {sk.establishedDate || doc.dateString || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div
                      style={{
                        borderTop: '1px solid #374151',
                        marginBottom: '8px',
                      }}
                    />

                    {doc.signerDepartment.trim() && (
                      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                        {doc.signerDepartment}
                      </div>
                    )}
                    {doc.signerTitle.trim() && (
                      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                        {doc.signerTitle}
                      </div>
                    )}

                    {renderSignatureZone()}

                    <div
                      style={{
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {doc.signerName || 'Nama Pejabat Penandatangan'}
                    </div>
                    {doc.signerIdValue.trim() && (
                      <div style={{ fontSize: `${Math.max(doc.fontSizePt - 1, 9)}pt` }}>
                        {doc.signerIdLabel ? `${doc.signerIdLabel}. ` : ''}
                        {doc.signerIdValue}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <>
            {/* BAGIAN PEMBUKA KEPALA SURAT NON-SK */}
            {letterKind === 'surat-pengantar' ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {doc.recipientLines.some((l) => l.trim().length > 0) && (
                      <div>
                        {doc.recipientLines.map((line, idx) => (
                          <div key={idx} style={{ minHeight: '1em' }}>
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {doc.city}
                    {doc.city && doc.dateString ? ', ' : ''}
                    {doc.dateString}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '16px' }}>
                  <div
                    style={{
                      fontSize: `${doc.fontSizePt + 2}pt`,
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {doc.decreeTitle || 'SURAT PENGANTAR'}
                  </div>
                  <div style={{ marginTop: '3px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                    Nomor: {doc.letterNumber || '-'}
                  </div>
                </div>
              </>
            ) : doc.formatStyle === 'correspondence' ? (
              <>
                {/* Tempat & Tanggal di kanan atas */}
                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                  <span>
                    {doc.city}
                    {doc.city && doc.dateString ? ', ' : ''}
                    {doc.dateString}
                  </span>
                </div>

                {/* Metadata Nomor, Lampiran, Sifat, Hal */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '14px',
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ width: '82px', verticalAlign: 'top', padding: '1px 0' }}>
                        Nomor
                      </td>
                      <td style={{ width: '14px', verticalAlign: 'top', padding: '1px 0' }}>:</td>
                      <td
                        style={{
                          verticalAlign: 'top',
                          padding: '1px 0',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {doc.letterNumber || '-'}
                      </td>
                    </tr>
                    {doc.urgency && doc.urgency !== '-' && (
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>Sifat</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>{doc.urgency}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '1px 0' }}>Lampiran</td>
                      <td style={{ verticalAlign: 'top', padding: '1px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '1px 0' }}>
                        {doc.attachment || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '1px 0' }}>Hal</td>
                      <td style={{ verticalAlign: 'top', padding: '1px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '1px 0', fontWeight: 700 }}>
                        {doc.subject}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tujuan Surat */}
                {doc.recipientLines.some((l) => l.trim().length > 0) && (
                  <div style={{ marginBottom: '14px' }}>
                    {doc.recipientLines.map((line, idx) => (
                      <div key={idx} style={{ minHeight: '1em' }}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Format Decree: Judul Terpusat + Nomor di bawah judul */
              <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '18px' }}>
                <div
                  style={{
                    fontSize: `${doc.fontSizePt + 2}pt`,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {doc.decreeTitle || 'SURAT RESMI'}
                </div>
                <div style={{ marginTop: '3px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                  Nomor: {doc.letterNumber || '-'}
                </div>
              </div>
            )}

            {/* SALAM PEMBUKA */}
            {doc.salutation.trim() && (
              <div style={{ marginBottom: '10px' }}>{doc.salutation}</div>
            )}

            {/* BLOK PIHAK PEMBERI & PENERIMA (untuk Tugas, Keterangan, Kuasa, Pengantar) */}
            {letterKind !== 'standard' ? (
              (() => {
                const giver = doc.giverParty || createDefaultGiverParty(kop);
                const recipients =
                  doc.recipientParties && doc.recipientParties.length > 0
                    ? doc.recipientParties
                    : [doc.recipientParty || createDefaultRecipientParty('guru')];
                const isMultiRecipientTable =
                  letterKind !== 'surat-kuasa' && recipients.length > 1;
                const recipient = recipients[0];
                const recipientIdLabel =
                  recipient.roleType === 'siswa' ? 'NISN' : recipient.teacherIdType;
                const recipientIdValue =
                  recipient.roleType === 'siswa'
                    ? recipient.studentNisn
                    : recipient.teacherIdNumber;

                const allSiswa = recipients.every((r) => r.roleType === 'siswa');
                const allGuru = recipients.every((r) => r.roleType === 'guru');
                const tableIdHeader = allSiswa
                  ? 'NISN'
                  : allGuru
                    ? 'NIY/NUPTK'
                    : 'NIY/NUPTK / NISN';
                const tableRoleHeader = allSiswa
                  ? 'Kelas'
                  : allGuru
                    ? 'Jabatan'
                    : 'Jabatan / Kelas';

                return (
                  <>
                    <div style={{ marginBottom: '4px' }}>
                      Yang bertanda tangan di bawah ini:
                    </div>
                    {renderPartyRows([
                      { label: 'Nama', value: giver.name },
                      { label: 'Jabatan', value: giver.title },
                      { label: 'Alamat', value: giver.address },
                    ])}

                    <div style={{ marginBottom: '4px', textAlign: 'justify' }}>
                      {letterKind === 'surat-kuasa'
                        ? `Selanjutnya disebut sebagai PIHAK PERTAMA (Pemberi Kuasa), ${
                            doc.openingParagraph.trim()
                              ? doc.openingParagraph.charAt(0).toLowerCase() +
                                doc.openingParagraph.slice(1)
                              : 'dengan ini memberikan kuasa penuh kepada:'
                          }`
                        : doc.openingParagraph.trim() ||
                          (letterKind === 'surat-tugas'
                            ? 'Dengan ini memberikan tugas kepada:'
                            : letterKind === 'surat-keterangan'
                              ? 'Dengan ini menerangkan dengan sesungguhnya bahwa:'
                              : 'Dengan ini memberikan surat pengantar kepada:')}
                    </div>

                    {isMultiRecipientTable ? (
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          margin: '8px 0 14px 0',
                          fontSize: `${Math.max(doc.fontSizePt - 0.5, 9.5)}pt`,
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                border: '1px solid #1f2937',
                                padding: '5px 6px',
                                width: '34px',
                                textAlign: 'center',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              No.
                            </th>
                            <th
                              style={{
                                border: '1px solid #1f2937',
                                padding: '5px 8px',
                                textAlign: 'left',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              Nama
                            </th>
                            <th
                              style={{
                                border: '1px solid #1f2937',
                                padding: '5px 8px',
                                textAlign: 'left',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              Tempat/Tanggal Lahir
                            </th>
                            <th
                              style={{
                                border: '1px solid #1f2937',
                                padding: '5px 8px',
                                textAlign: 'left',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              {tableIdHeader}
                            </th>
                            <th
                              style={{
                                border: '1px solid #1f2937',
                                padding: '5px 8px',
                                textAlign: 'left',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              {tableRoleHeader}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipients.map((person, idx) => {
                            const idDisplay = allSiswa
                              ? person.studentNisn || '-'
                              : allGuru
                                ? person.teacherIdNumber
                                  ? `${person.teacherIdType}. ${person.teacherIdNumber}`
                                  : '-'
                                : person.roleType === 'siswa'
                                  ? person.studentNisn
                                    ? `NISN. ${person.studentNisn}`
                                    : '-'
                                  : person.teacherIdNumber
                                    ? `${person.teacherIdType}. ${person.teacherIdNumber}`
                                    : '-';

                            return (
                              <tr key={idx}>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 6px',
                                    textAlign: 'center',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {idx + 1}.
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                    fontWeight: 600,
                                  }}
                                >
                                  {person.name || '-'}
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {person.birthPlaceDate || '-'}
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {idDisplay}
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {person.position || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      renderPartyRows([
                        { label: 'Nama', value: recipient.name },
                        { label: 'Tempat / Tanggal Lahir', value: recipient.birthPlaceDate },
                        { label: recipientIdLabel, value: recipientIdValue },
                        {
                          label: recipient.roleType === 'siswa' ? 'Kelas' : 'Jabatan',
                          value: recipient.position,
                        },
                        { label: 'Alamat', value: recipient.address },
                      ])
                    )}

                    {letterKind === 'surat-kuasa' && (
                      <div style={{ marginBottom: '10px' }}>
                        Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong> (Penerima Kuasa).
                      </div>
                    )}

                    {/* Tabel Berkas Pengantar untuk Surat Pengantar */}
                    {letterKind === 'surat-pengantar' &&
                      doc.forwardingItems &&
                      doc.forwardingItems.length > 0 && (
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            margin: '8px 0 14px 0',
                            fontSize: `${Math.max(doc.fontSizePt - 0.5, 9.5)}pt`,
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  border: '1px solid #1f2937',
                                  padding: '5px 6px',
                                  width: '34px',
                                  textAlign: 'center',
                                  backgroundColor: '#f8fafc',
                                }}
                              >
                                No.
                              </th>
                              <th
                                style={{
                                  border: '1px solid #1f2937',
                                  padding: '5px 8px',
                                  textAlign: 'left',
                                  backgroundColor: '#f8fafc',
                                }}
                              >
                                Naskah Dinas / Berkas yang Dikirim
                              </th>
                              <th
                                style={{
                                  border: '1px solid #1f2937',
                                  padding: '5px 8px',
                                  width: '115px',
                                  textAlign: 'center',
                                  backgroundColor: '#f8fafc',
                                }}
                              >
                                Banyaknya
                              </th>
                              <th
                                style={{
                                  border: '1px solid #1f2937',
                                  padding: '5px 8px',
                                  width: '175px',
                                  textAlign: 'left',
                                  backgroundColor: '#f8fafc',
                                }}
                              >
                                Keterangan
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.forwardingItems.map((item, idx) => (
                              <tr key={item.id}>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 6px',
                                    textAlign: 'center',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {idx + 1}.
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                    whiteSpace: 'pre-line',
                                  }}
                                >
                                  {item.description || '-'}
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    textAlign: 'center',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  {item.quantity || '-'}
                                </td>
                                <td
                                  style={{
                                    border: '1px solid #1f2937',
                                    padding: '5px 8px',
                                    verticalAlign: 'top',
                                    whiteSpace: 'pre-line',
                                  }}
                                >
                                  {item.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                  </>
                );
              })()
            ) : (
              /* PARAGRAF PEMBUKA STANDAR */
              doc.openingParagraph.trim() && (
                <p
                  style={{
                    margin: '0 0 12px 0',
                    textAlign: 'justify',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {doc.openingParagraph}
                </p>
              )
            )}

            {/* BLOK RINCIAN TERSTRUKTUR */}
            {doc.detailRows.length > 0 && (
              <table
                style={{
                  width: 'calc(100% - 20px)',
                  borderCollapse: 'collapse',
                  margin: '6px 0 14px 20px',
                }}
              >
                <tbody>
                  {doc.detailRows.map((row) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          width: '165px',
                          verticalAlign: 'top',
                          padding: '2.5px 6px 2.5px 0',
                        }}
                      >
                        {row.label}
                      </td>
                      <td style={{ width: '14px', verticalAlign: 'top', padding: '2.5px 0' }}>
                        :
                      </td>
                      <td
                        style={{
                          verticalAlign: 'top',
                          padding: '2.5px 0',
                          fontWeight: 500,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* PARAGRAF ISI */}
            {doc.bodyParagraphs.map(
              (para, index) =>
                para.trim() && (
                  <p
                    key={index}
                    style={{
                      margin: '0 0 11px 0',
                      textAlign: 'justify',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {para}
                  </p>
                )
            )}

            {/* PARAGRAF PENUTUP */}
            {doc.closingParagraph.trim() && (
              <p
                style={{
                  margin: '0 0 22px 0',
                  textAlign: 'justify',
                  whiteSpace: 'pre-line',
                }}
              >
                {doc.closingParagraph}
              </p>
            )}

            {/* BLOK PENGESAHAN & TANDA TANGAN */}
            {letterKind === 'surat-kuasa' ? (
              <div style={{ marginTop: '12px', pageBreakInside: 'avoid' }}>
                {(doc.city || doc.dateString) && (
                  <div style={{ textAlign: 'right', marginBottom: '8px' }}>
                    {doc.city}
                    {doc.city && doc.dateString ? ', ' : ''}
                    {doc.dateString}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '24px',
                  }}
                >
                  {/* Kolom Kiri: Penerima Kuasa */}
                  <div style={{ width: '240px', textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.35 }}>Penerima Kuasa,</div>
                    {doc.recipientParty?.position && (
                      <div style={{ lineHeight: 1.35 }}>{doc.recipientParty.position}</div>
                    )}
                    {doc.showManualSignatureBox ? (
                      <div
                        style={{
                          height: '82px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '190px',
                            height: '72px',
                            border: '1px dashed #64748b',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.72)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '8pt',
                              color: '#94a3b8',
                              fontFamily: 'Arial, sans-serif',
                              letterSpacing: '0.3px',
                            }}
                          >
                            Tanda Tangan
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '82px' }} />
                    )}
                    <div
                      style={{
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      {doc.recipientParty?.name || 'Nama Penerima Kuasa'}
                    </div>
                  </div>

                  {/* Kolom Kanan: Pemberi Kuasa + Stempel */}
                  <div style={{ width: '260px', position: 'relative', textAlign: 'left' }}>
                    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                      {doc.signerDepartment.trim() || 'Pemberi Kuasa,'}
                    </div>
                    {doc.signerTitle.trim() && (
                      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                        {doc.signerTitle}
                      </div>
                    )}

                    {renderSignatureZone()}

                    <div
                      style={{
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {doc.signerName || doc.giverParty?.name || 'Nama Pemberi Kuasa'}
                    </div>
                    {doc.signerIdValue.trim() && (
                      <div style={{ fontSize: `${Math.max(doc.fontSizePt - 1, 9)}pt` }}>
                        {doc.signerIdLabel ? `${doc.signerIdLabel}. ` : ''}
                        {doc.signerIdValue}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '12px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    width: '260px',
                    position: 'relative',
                    textAlign: 'left',
                  }}
                >
                  {/* Untuk surat format decree, tampilkan kota & tanggal di atas jabatan penandatangan */}
                  {doc.formatStyle === 'decree' && (doc.city || doc.dateString) && (
                    <div style={{ marginBottom: '2px' }}>
                      {doc.city}
                      {doc.city && doc.dateString ? ', ' : ''}
                      {doc.dateString}
                    </div>
                  )}

                  {doc.signerDepartment.trim() && (
                    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                      {doc.signerDepartment}
                    </div>
                  )}

                  {doc.signerTitle.trim() && (
                    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                      {doc.signerTitle}
                    </div>
                  )}

                  {/* Area Tanda Tangan & Stempel */}
                  {renderSignatureZone()}

                  <div
                    style={{
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  >
                    {doc.signerName || 'Nama Pejabat Penandatangan'}
                  </div>

                  {doc.signerIdValue.trim() && (
                    <div style={{ fontSize: `${Math.max(doc.fontSizePt - 1, 9)}pt` }}>
                      {doc.signerIdLabel ? `${doc.signerIdLabel}. ` : ''}
                      {doc.signerIdValue}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* TEMBUSAN */}
        {doc.ccList.some((c) => c.trim().length > 0) && (
          <div
            style={{
              marginTop: '24px',
              fontSize: `${Math.max(doc.fontSizePt - 1, 9)}pt`,
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ fontWeight: 600, textDecoration: 'underline', marginBottom: '2px' }}>
              Tembusan:
            </div>
            <ol style={{ margin: 0, paddingLeft: '18px' }}>
              {doc.ccList
                .filter((c) => c.trim().length > 0)
                .map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
