import { useState, useMemo } from 'react';

/* ============================================================================
   Cloning Strategy Simulation
   ----------------------------------------------------------------------------
   A 6-decision branching simulation covering the planning of a molecular
   cloning experiment. Students choose one of three project goals and then
   make sequential choices about source nucleic acid, template processing,
   PCR primer design, vector, restriction-enzyme strategy and validation
   method. Failures only become apparent at realistic checkpoints (the
   transformation plate and the validation readout). Feedback is reserved
   for the final debrief; an info button on each step guides without
   prescribing.
   ========================================================================= */

/* -------------------- Palette & shared style tokens ----------------------- */

const PALETTE = {
  bg: '#0d1117',
  bgPanel: '#161b22',
  bgPanelAlt: '#1c2330',
  border: '#30363d',
  borderStrong: '#444c56',
  text: '#d4dce6',
  textDim: '#8b95a7',
  textMuted: '#6e7886',
  accent: '#3388cc',
  accentBright: '#58a6ff',
  accentSoft: 'rgba(51, 136, 204, 0.15)',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  bandBlue: '#3388cc',
  bandWhite: '#e6edf3',
  agar: '#2a4a3a'
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

/* --------------------------- Goal definitions ----------------------------- */

const GOALS = {
  A: {
    id: 'A',
    title: 'Recombinant Insulin',
    subtitle: 'Express human insulin in E. coli',
    body:
      'Your aim is to produce recombinant human insulin in bacteria for downstream purification. ' +
      'You need the human INS coding sequence cloned into a vector that can drive its expression in E. coli.',
    accent: '#58a6ff',
    targetGene: 'human INS',
    targetHost: 'E. coli'
  },
  B: {
    id: 'B',
    title: 'Bacterial Luciferase in Mammalian Cells',
    subtitle: 'Express V. harveyi luxAB in human cells',
    body:
      'You want to express the bacterial luxAB luciferase operon in cultured mammalian cells. ' +
      'You need the bacterial coding sequence cloned into a vector that can drive expression in human cells.',
    accent: '#f0b842',
    targetGene: 'V. harveyi luxAB',
    targetHost: 'mammalian cells'
  },
  C: {
    id: 'C',
    title: 'Liver-Specific GFP Reporter',
    subtitle: 'Study the human albumin promoter',
    body:
      'You want to test whether the human albumin promoter region is sufficient to drive ' +
      'liver-specific gene expression. You need to clone the promoter upstream of GFP in a ' +
      'reporter vector that has no promoter of its own.',
    accent: '#7ee787',
    targetGene: 'human ALB promoter',
    targetHost: 'reporter cells'
  }
};

/* --------------------------- Decision data -------------------------------- */
/* Each decision lists 3 options. Each option carries time/cost and a stable
   `value` used in the state engine. Info text is conceptual, not directive. */

const DECISIONS = [
  {
    id: 'source',
    stepNumber: 1,
    shortLabel: 'Source',
    title: 'Choose your starting nucleic acid',
    question: 'Which nucleic acid will you isolate from your source organism?',
    info: {
      title: 'Genomic DNA vs messenger RNA',
      body:
        'Genomic DNA contains every gene in its full chromosomal context — including introns, ' +
        'untranslated regions and flanking regulatory sequences such as promoters. ' +
        '\n\nMessenger RNA (mRNA) is transcribed from genes and then processed: in eukaryotes, ' +
        'introns are spliced out and a poly-A tail is added to the 3′ end. Prokaryotic mRNA is ' +
        'not spliced and is not polyadenylated. \n\nWhen choosing a starting material, think ' +
        'carefully about which sequences you actually need in your final construct, and which ' +
        'cellular processes have (or have not) acted on each pool of nucleic acid.'
    },
    options: [
      {
        value: 'gDNA',
        label: 'Isolate genomic DNA',
        detail: 'Phenol-chloroform or column-based extraction of total genomic DNA.',
        time: 2,
        cost: 80
      },
      {
        value: 'mRNA',
        label: 'Isolate mRNA',
        detail: 'Total RNA extraction followed by mRNA enrichment.',
        time: 2,
        cost: 100
      }
    ]
  },
  {
    id: 'template',
    stepNumber: 2,
    shortLabel: 'Template',
    title: 'Produce a double-stranded DNA insert',
    question: 'How will you prepare a double-stranded DNA template for cloning?',
    info: {
      title: 'PCR templates and reverse transcription',
      body:
        'PCR polymerases such as Taq use DNA — not RNA — as a template. To amplify from an RNA ' +
        'starting material, the RNA must first be reverse-transcribed into complementary DNA ' +
        '(cDNA) using reverse transcriptase and a priming oligonucleotide. \n\nThe choice of ' +
        'priming oligonucleotide determines which RNA species are converted: oligo-dT primers ' +
        'anneal to poly-A tails, while random hexamer primers anneal at many positions on any ' +
        'RNA molecule. \n\nIf your starting material is already DNA, no reverse transcription ' +
        'is required.'
    },
    options: [
      {
        value: 'direct_pcr',
        label: 'PCR directly from my isolated nucleic acid',
        detail: 'Standard PCR with a high-fidelity polymerase.',
        time: 1,
        cost: 50
      },
      {
        value: 'rt_oligodt',
        label: 'Reverse transcribe with oligo-dT primers, then PCR',
        detail: 'cDNA synthesis primed from poly-A tails, followed by PCR.',
        time: 2,
        cost: 120
      },
      {
        value: 'rt_random',
        label: 'Reverse transcribe with random hexamer primers, then PCR',
        detail: 'cDNA synthesis primed at many positions, followed by PCR.',
        time: 2,
        cost: 120
      }
    ]
  },
  {
    id: 'primers',
    stepNumber: 3,
    shortLabel: 'Primers',
    title: 'Design your PCR primers',
    question: 'How will you design the gene-specific primers used to amplify your insert?',
    info: {
      title: 'Engineering ends onto your insert',
      body:
        'PCR primers can be designed with extra sequence at their 5′ ends. These tails do not ' +
        'need to anneal to the template, but they are incorporated into the resulting PCR ' +
        'product. \n\nA common strategy is to add a restriction-enzyme recognition site to each ' +
        'primer (often with a few extra bases of "filler" so the enzyme can bind and cut close ' +
        'to the end). The PCR product can then be digested with the corresponding enzyme(s) to ' +
        'generate ends that are compatible with a similarly digested vector. \n\nIf both ends ' +
        'of the insert carry the same recognition site, the insert can ligate into the vector ' +
        'in either orientation. If each end carries a different site, ligation is forced to be ' +
        'directional.'
    },
    options: [
      {
        value: 'plain',
        label: 'Gene-specific primers only',
        detail: 'No additional sequence at the 5′ ends of the primers.',
        time: 0,
        cost: 40
      },
      {
        value: 'same_site',
        label: 'Add the same restriction site (EcoRI) to both primers',
        detail: 'EcoRI tail on both forward and reverse primers.',
        time: 0,
        cost: 40
      },
      {
        value: 'different_sites',
        label: 'Add different restriction sites to each primer',
        detail: 'EcoRI tail on the forward primer; BamHI tail on the reverse primer.',
        time: 0,
        cost: 40
      }
    ]
  },
  {
    id: 'vector',
    stepNumber: 4,
    shortLabel: 'Vector',
    title: 'Choose a cloning vector',
    question: 'Which vector will you use to receive your insert?',
    info: {
      title: 'Vector components and what they do',
      body:
        'Cloning vectors typically carry: an origin of replication that determines which host ' +
        'cells can propagate the plasmid; a selectable marker (most often an antibiotic ' +
        'resistance gene) that allows transformed cells to be identified; a multiple cloning ' +
        'site (MCS) containing several unique restriction sites; and — for expression vectors — ' +
        'a promoter and a polyadenylation/terminator signal flanking the MCS so that any ORF ' +
        'cloned in is transcribed. Some vectors also carry a screening element (such as lacZα ' +
        'for blue/white selection) or an affinity tag for protein purification. \n\nPromoters ' +
        'are host-specific. A bacterial promoter (such as T7) is only recognised by bacterial ' +
        'RNA polymerases; a mammalian promoter (such as CMV) is only recognised by mammalian ' +
        'transcription machinery. \n\nFor experiments where the goal is to test the activity ' +
        'of a candidate promoter, the vector itself must lack a promoter — otherwise the ' +
        'reporter gene would be expressed regardless of what was cloned upstream.'
    },
    options: [
      {
        value: 'pET28a',
        label: 'pET28a',
        detail:
          'Bacterial expression vector. Components: T7 promoter · His₆ tag · MCS · ' +
          'KanR · pBR322 origin.',
        time: 0,
        cost: 60
      },
      {
        value: 'pcDNA3.1',
        label: 'pcDNA3.1(+)',
        detail:
          'Mammalian expression vector. Components: CMV promoter · MCS · BGH polyA · ' +
          'NeoR (mammalian selection) · AmpR (bacterial selection).',
        time: 0,
        cost: 60
      },
      {
        value: 'pEGFP-1',
        label: 'pEGFP-1',
        detail:
          'Promoterless GFP reporter vector. Components: MCS · GFP ORF · SV40 polyA · ' +
          'KanR. No promoter of its own.',
        time: 0,
        cost: 60
      },
      {
        value: 'pUC19',
        label: 'pUC19',
        detail:
          'General-purpose cloning vector. Components: lacZα (blue/white screening) · ' +
          'MCS · AmpR. No expression cassette.',
        time: 0,
        cost: 40
      }
    ]
  },
  {
    id: 're',
    stepNumber: 5,
    shortLabel: 'Restriction',
    title: 'Choose your restriction-enzyme strategy',
    question: 'How will you generate compatible ends on your vector and insert?',
    info: {
      title: 'Restriction enzymes and ligation',
      body:
        'Type II restriction endonucleases recognise specific (typically palindromic) DNA ' +
        'sequences and cut at a fixed position, leaving either staggered ("sticky") or flush ' +
        '("blunt") ends. EcoRI (GAATTC) and BamHI (GGATCC) both leave 5′ overhangs, but the ' +
        'overhangs are different: an EcoRI end can only ligate to another EcoRI end, not to a ' +
        'BamHI end. EcoRV (GATATC) leaves blunt ends. \n\nSuccessful ligation requires that the ' +
        'vector and insert have ends that can base-pair (or at least be joined): identical ' +
        'sticky ends on both molecules, or blunt ends on both. \n\nUsing two different sticky ' +
        'ends on the same fragment forces directional cloning — the insert can only go in one ' +
        'way. Using identical sticky ends on both ends, or using blunt ends, allows the insert ' +
        'to ligate in either orientation. Blunt-end ligation is also markedly less efficient ' +
        'than sticky-end ligation.'
    },
    options: [
      {
        value: 'single_eco',
        label: 'Single digest with EcoRI',
        detail: 'Cut both vector and insert with EcoRI, then ligate.',
        time: 1,
        cost: 40
      },
      {
        value: 'double_eco_bam',
        label: 'Double digest with EcoRI and BamHI',
        detail: 'Cut both vector and insert with EcoRI + BamHI, then ligate.',
        time: 1,
        cost: 60
      },
      {
        value: 'blunt',
        label: 'Blunt-end cloning with EcoRV',
        detail: 'Polish ends as needed and ligate into an EcoRV-cut vector.',
        time: 2,
        cost: 40
      }
    ]
  },
  {
    id: 'validation',
    stepNumber: 6,
    shortLabel: 'Validate',
    title: 'Validate your construct',
    question: 'How will you check that your construct is correct?',
    info: {
      title: 'Screening and validating recombinant DNA',
      body:
        'Different validation methods give different information about a candidate ' +
        'construct. Colony PCR, using primers that flank the cloning site on the vector, ' +
        'detects whether an insert is present and gives an approximate size. Restriction ' +
        'digest of miniprepped plasmid DNA gives fragment sizes, which can also reveal ' +
        'orientation if the chosen enzymes cut the insert asymmetrically. Sanger sequencing ' +
        'reads the actual sequence of the construct, including orientation, point mutations ' +
        'and any unexpected sequence content. \n\nMore informative methods generally take ' +
        'longer and cost more. The choice depends on what failure modes are most likely for ' +
        'your particular cloning strategy.'
    },
    options: [
      {
        value: 'colony_pcr',
        label: 'Colony PCR with vector-flanking primers',
        detail: 'Pick colonies, run PCR, check for an insert-sized band.',
        time: 1,
        cost: 30
      },
      {
        value: 'digest',
        label: 'Miniprep + diagnostic restriction digest',
        detail: 'Miniprep candidate clones and digest to check fragment sizes.',
        time: 2,
        cost: 50
      },
      {
        value: 'sequencing',
        label: 'Miniprep + Sanger sequencing',
        detail: 'Miniprep candidate clones and submit for sequencing.',
        time: 5,
        cost: 100
      },
      {
        value: 'skip',
        label: 'Skip validation and proceed',
        detail: 'Move directly to the next stage of the project.',
        time: 0,
        cost: 0
      }
    ]
  }
];

/* --------------------------- Result engine -------------------------------- */
/* Pure functions over the choices object. Order matches the README in the
   block at the top of the file: insert availability → ligation → orientation
   → vector compatibility → final success. */

function computeInsertObtained(c) {
  if (!c.source || !c.template) return null;

  // gDNA path: only direct PCR yields a usable template
  if (c.source === 'gDNA') {
    return c.template === 'direct_pcr';
  }

  // mRNA path: direct PCR fails (DNA polymerase cannot read RNA)
  if (c.source === 'mRNA') {
    if (c.template === 'direct_pcr') return false;

    // Goal C: target is the albumin promoter, which is in genomic DNA only
    // — never represented in any mRNA pool. Both RT methods fail.
    if (c.goal === 'C') return false;

    // Goal A: human (eukaryotic) mRNA is polyadenylated → both RT methods work
    if (c.goal === 'A') return true;

    // Goal B: bacterial mRNA is NOT polyadenylated. Oligo-dT cannot prime.
    if (c.goal === 'B') return c.template === 'rt_random';
  }

  return false;
}

function computeInsertHasIntrons(c) {
  // Only Goal A (human INS) cloned from gDNA carries introns into the construct.
  // (Goal C's target is the promoter region itself, where 'intron' is not the
  // relevant problem — promoters are intentionally non-coding genomic DNA.)
  return c.goal === 'A' && c.source === 'gDNA' && computeInsertObtained(c) === true;
}

function computeLigationSuccess(c) {
  if (!c.primers || !c.re) return null;

  // No insert → nothing to ligate. The plate page handles this separately
  // (vector self-ligation), but for ligation_success we treat as false.
  if (computeInsertObtained(c) === false) return false;

  // Compatibility matrix (primers × re_strategy)
  const m = {
    plain: { single_eco: false, double_eco_bam: false, blunt: true },
    same_site: { single_eco: true, double_eco_bam: false, blunt: true },
    different_sites: { single_eco: false, double_eco_bam: true, blunt: true }
  };
  return m[c.primers]?.[c.re] ?? false;
}

function computeOrientationCorrect(c) {
  if (computeLigationSuccess(c) !== true) return null;

  // Directional cloning is guaranteed when both ends carry different sticky
  // sites and a double digest is performed.
  if (c.primers === 'different_sites' && c.re === 'double_eco_bam') return true;

  // Sequencing rescues a non-directional cloning: the student would screen
  // multiple candidates and pick a correctly oriented one. Other validation
  // methods don't reveal orientation in our simplified model.
  if (c.validation === 'sequencing') return true;

  // Otherwise leave orientation as 50/50 — deterministic from the seed so a
  // given parameter set always gives the same outcome.
  const seed = `${c.goal}|${c.source}|${c.template}|${c.primers}|${c.re}|${c.vector}`;
  const hash = [...seed].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return hash % 2 === 0;
}

function computeVectorCompatible(c) {
  if (!c.vector || !c.goal) return null;
  const correct = { A: 'pET28a', B: 'pcDNA3.1', C: 'pEGFP-1' };
  return c.vector === correct[c.goal];
}

function computeFinalSuccess(c) {
  const insert = computeInsertObtained(c);
  if (insert !== true) return false;
  if (computeInsertHasIntrons(c)) return false;
  if (computeLigationSuccess(c) !== true) return false;
  if (computeOrientationCorrect(c) !== true) return false;
  if (computeVectorCompatible(c) !== true) return false;
  return true;
}

/* Categorise the transformation plate appearance from cumulative state. */
function computePlateState(c) {
  const insertOk = computeInsertObtained(c);
  const ligationOk = computeLigationSuccess(c);
  const isPUC = c.vector === 'pUC19';
  const isBlunt = c.re === 'blunt';

  if (insertOk === false) {
    // No insert at all. Vector either self-ligates (single/blunt cut) or
    // remains linear (double cut, removes the dropout fragment).
    if (c.re === 'double_eco_bam') return isPUC ? 'empty' : 'empty';
    return isPUC ? 'pUC_blue' : 'background';
  }

  if (ligationOk === false) {
    // Insert was made but ends are not compatible with the vector.
    // Background colonies form from incomplete digestion / re-ligation only.
    return isPUC ? 'pUC_blue' : 'background';
  }

  // Successful ligation
  if (isBlunt) return isPUC ? 'pUC_white_sparse' : 'sparse';
  return isPUC ? 'pUC_white' : 'lawn';
}

/* ------------------------ Pretty-print helpers ---------------------------- */

function formatChoiceLabel(decisionId, value) {
  if (value === undefined) return '—';
  const dec = DECISIONS.find(d => d.id === decisionId);
  if (!dec) return String(value);
  const opt = dec.options.find(o => o.value === value);
  return opt ? opt.label : String(value);
}

/* ============================================================================
   Visual components — programmatic SVG, no external assets
   ========================================================================= */

/* Tiny seeded PRNG so colony positions are stable on re-render but vary
   sensibly across plate states. */
function makePrng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/* --------------------------- Petri dish ----------------------------------- */

function PetriDish({ plateState, seed }) {
  const cx = 160, cy = 160, r = 130;
  const rng = makePrng(`${plateState}|${seed}`);

  // Decide colony population
  let n = 0;
  let colonyType = 'white'; // 'white' | 'blue' | 'mixed'
  let satellite = false;

  switch (plateState) {
    case 'lawn':
      n = 90; colonyType = 'white'; break;
    case 'sparse':
      n = 11; colonyType = 'white'; break;
    case 'empty':
      n = 1; colonyType = 'white'; break;
    case 'background':
      n = 6; colonyType = 'white'; satellite = true; break;
    case 'pUC_white':
      n = 70; colonyType = 'mixed_mostly_white'; break;
    case 'pUC_white_sparse':
      n = 10; colonyType = 'mixed_mostly_white'; break;
    case 'pUC_blue':
      n = 50; colonyType = 'mixed_mostly_blue'; break;
    default:
      n = 0;
  }

  const colonies = [];
  for (let i = 0; i < n; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * (r - 12);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    let size = 2.6 + rng() * 1.4;
    let fill = '#f0f3f8';
    if (colonyType === 'mixed_mostly_white') {
      const isBlue = rng() < 0.06;
      fill = isBlue ? '#3a6fb5' : '#f0f3f8';
    } else if (colonyType === 'mixed_mostly_blue') {
      const isWhite = rng() < 0.08;
      fill = isWhite ? '#f0f3f8' : '#3a6fb5';
    }
    if (satellite) size *= 0.7;
    colonies.push({ x, y, size, fill, opacity: satellite ? 0.55 : 0.9 });
  }

  return (
    <svg
      viewBox="0 0 320 320"
      width="280"
      height="280"
      role="img"
      aria-label={`Transformation plate: ${plateState.replace(/_/g, ' ')}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="agar" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3d6b54" />
          <stop offset="60%" stopColor="#2a4a3a" />
          <stop offset="100%" stopColor="#1a3024" />
        </radialGradient>
        <radialGradient id="dishRim" cx="50%" cy="50%" r="50%">
          <stop offset="92%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
      </defs>

      {/* Petri dish edge shadow */}
      <circle cx={cx} cy={cy + 3} r={r + 4} fill="rgba(0,0,0,0.4)" />
      {/* Agar */}
      <circle cx={cx} cy={cy} r={r} fill="url(#agar)" stroke="#0a0e12" strokeWidth="2" />
      {/* Subtle highlight */}
      <ellipse cx={cx - 30} cy={cy - 50} rx={60} ry={20} fill="rgba(255,255,255,0.05)" />

      {/* Colonies */}
      {colonies.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={c.size}
          fill={c.fill}
          opacity={c.opacity}
        />
      ))}

      {/* Rim shadow */}
      <circle cx={cx} cy={cy} r={r} fill="url(#dishRim)" pointerEvents="none" />
    </svg>
  );
}

/* ------------------------------ Gel image --------------------------------- */
/* Generic gel: pass an array of lane definitions, each with a list of
   { sizeBp, intensity } bands. Sizes are positioned on a log scale within
   the configured size range. */

function GelImage({ lanes, ladder = [3000, 2000, 1500, 1000, 700, 500, 300, 100], title }) {
  const w = 360;
  const h = 280;
  const padTop = 40;
  const padBottom = 30;
  const padLeftLadder = 56;
  const padRight = 16;
  const gelTop = padTop;
  const gelBottom = h - padBottom;
  const gelLeft = padLeftLadder;
  const gelRight = w - padRight;
  const gelWidth = gelRight - gelLeft;

  // Log-scale Y position for a size in bp
  const logMin = Math.log10(80);
  const logMax = Math.log10(4000);
  function yFor(size) {
    const lg = Math.log10(Math.min(Math.max(size, 80), 4000));
    const t = (lg - logMin) / (logMax - logMin);
    // Larger fragments run less far (closer to wells, top of gel)
    return gelTop + (1 - t) * (gelBottom - gelTop) * 0.85 + 8;
  }

  const laneWidth = gelWidth / (lanes.length + 1); // first slot reserved for ladder
  const ladderX = gelLeft + laneWidth * 0.5;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={title || 'Agarose gel image'}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="gelBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0e12" />
          <stop offset="100%" stopColor="#161b22" />
        </linearGradient>
        <filter id="bandGlow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Gel background */}
      <rect x={gelLeft - 10} y={gelTop - 10} width={gelWidth + 20} height={gelBottom - gelTop + 20}
            fill="url(#gelBg)" stroke="#2a2f37" strokeWidth="1" rx="4" />

      {/* Wells at the top */}
      <rect x={ladderX - 14} y={gelTop - 4} width="28" height="6" fill="#000" opacity="0.6" />
      {lanes.map((_, i) => (
        <rect
          key={i}
          x={gelLeft + laneWidth * (i + 1) + laneWidth * 0.5 - 14}
          y={gelTop - 4}
          width="28"
          height="6"
          fill="#000"
          opacity="0.6"
        />
      ))}

      {/* Ladder bands */}
      {ladder.map(s => (
        <g key={s}>
          <rect
            x={ladderX - 14}
            y={yFor(s) - 1.5}
            width="28"
            height="3"
            fill="#7ee787"
            opacity="0.85"
            filter="url(#bandGlow)"
          />
          <text
            x={gelLeft - 10}
            y={yFor(s) + 4}
            textAnchor="end"
            fontFamily={FONT_MONO}
            fontSize="11"
            fill={PALETTE.textDim}
          >
            {s}
          </text>
        </g>
      ))}

      {/* Sample bands */}
      {lanes.map((lane, li) => {
        const lx = gelLeft + laneWidth * (li + 1) + laneWidth * 0.5;
        return (
          <g key={li}>
            {(lane.bands || []).map((b, bi) => (
              <rect
                key={bi}
                x={lx - 14}
                y={yFor(b.sizeBp) - 1.5 - (b.thick ? 1.5 : 0)}
                width="28"
                height={3 + (b.thick ? 3 : 0)}
                fill="#a5d6ff"
                opacity={b.intensity ?? 0.9}
                filter="url(#bandGlow)"
              />
            ))}
          </g>
        );
      })}

      {/* Lane labels */}
      <text x={ladderX} y={h - 10} textAnchor="middle"
            fontFamily={FONT_BODY} fontSize="12" fill={PALETTE.textDim}>
        Ladder
      </text>
      {lanes.map((lane, li) => (
        <text
          key={li}
          x={gelLeft + laneWidth * (li + 1) + laneWidth * 0.5}
          y={h - 10}
          textAnchor="middle"
          fontFamily={FONT_BODY}
          fontSize="12"
          fill={PALETTE.text}
        >
          {lane.label}
        </text>
      ))}

      {/* Size unit */}
      <text x={gelLeft - 10} y={gelTop - 14} textAnchor="end"
            fontFamily={FONT_BODY} fontSize="11" fill={PALETTE.textMuted}>
        bp
      </text>
    </svg>
  );
}

/* --------------------------- Insert size table ---------------------------- */

const INSERT_SIZES = {
  // Approximate — pedagogically meaningful, not precise.
  A: { cdna: 330, gdna: 1430 },   // human INS (3 exons / 2 introns)
  B: { cdna: 2200 },               // luxAB operon, bacterial → no introns
  C: { gdna: 700 }                 // human ALB promoter region
};

const VECTOR_BACKBONE = {
  pET28a: 5300,
  'pcDNA3.1': 5400,
  'pEGFP-1': 4200,
  pUC19: 2700
};

function expectedInsertSize(c) {
  if (c.goal === 'A') {
    return c.source === 'gDNA' ? INSERT_SIZES.A.gdna : INSERT_SIZES.A.cdna;
  }
  if (c.goal === 'B') return INSERT_SIZES.B.cdna;
  if (c.goal === 'C') return INSERT_SIZES.C.gdna;
  return 500;
}

/* Used in colony PCR: vector-flank primers add roughly 200 bp of flanking
   sequence to whatever insert (or empty MCS) is amplified. */
function colonyPcrBandSize(c) {
  const insertOk = computeInsertObtained(c);
  const ligationOk = computeLigationSuccess(c);
  const flank = 200;

  if (!insertOk || !ligationOk) return flank; // empty vector → small band

  let size = expectedInsertSize(c);
  // If introns are present (Goal A + gDNA), the inserted fragment is the
  // larger gDNA size, so the band runs higher.
  return size + flank;
}

/* ============================================================================
   Plasmid map data + component
   ----------------------------------------------------------------------------
   Each vector is described as a list of features, each occupying an arc on
   the plasmid circle. Positions are in degrees on a clock face (0° = top,
   clockwise). Coordinates are pedagogically faithful — relative sizes and
   orderings match real maps, but exact bp coordinates are not used because
   they're not pedagogically useful here.

   Feature kinds drive colour and arrowhead:
     promoter   - drives a downstream gene; rendered as a thin arrow
     gene       - protein-coding; rendered as a thick arrow
     reporter   - GFP/lacZα/etc; thick arrow with a distinctive colour
     resistance - selectable marker; thick arrow
     ori        - origin of replication; rendered without an arrowhead
     mcs        - multiple cloning site; rendered as a small notched bar
     terminator - polyA / terminator signal; rendered as a small bar
     tag        - affinity tag (His6 etc); rendered as a thin arrow
     insert     - the cloned insert in a constructed map
   ========================================================================= */

const FEATURE_COLORS = {
  promoter: '#f0b842',
  gene: '#7ee787',
  reporter: '#7ee787',
  resistance: '#d97757',
  ori: '#a371f7',
  mcs: '#d4dce6',
  terminator: '#8b95a7',
  tag: '#58a6ff',
  insert: '#58a6ff',
  insert_problem: '#f85149'
};

/* Each feature: { name, kind, start, end, label, info, direction }
   - start/end are degrees (0=top, clockwise)
   - direction is +1 (clockwise) or -1 (anticlockwise) — determines arrow tip
*/

const VECTOR_MAPS = {
  pET28a: {
    name: 'pET28a',
    sizeBp: 5369,
    description: 'Bacterial expression vector',
    features: [
      { name: 'T7 promoter', kind: 'promoter', start: 340, end: 0, direction: 1,
        info: 'Recognised by T7 RNA polymerase. Active only in E. coli strains carrying T7 polymerase (e.g. BL21(DE3)). Not active in mammalian cells.' },
      { name: 'His₆ tag', kind: 'tag', start: 8, end: 22, direction: 1,
        info: 'Six-histidine affinity tag. Fuses to the N-terminus of the cloned ORF. Allows purification by nickel-affinity chromatography.' },
      { name: 'MCS', kind: 'mcs', start: 28, end: 58, direction: 1,
        info: 'Multiple cloning site. Contains unique restriction sites including EcoRI, BamHI, NdeI, XhoI for cloning your insert.' },
      { name: 'KanR', kind: 'resistance', start: 110, end: 200, direction: 1,
        info: 'Kanamycin resistance gene. Allows selection of transformed E. coli on kanamycin-containing plates.' },
      { name: 'pBR322 ori', kind: 'ori', start: 230, end: 300, direction: 1,
        info: 'Origin of replication. Allows the plasmid to propagate in E. coli at moderate copy number.' }
    ]
  },
  'pcDNA3.1': {
    name: 'pcDNA3.1(+)',
    sizeBp: 5428,
    description: 'Mammalian expression vector',
    features: [
      { name: 'CMV promoter', kind: 'promoter', start: 335, end: 5, direction: 1,
        info: 'Strong constitutive promoter from human cytomegalovirus. Active in most mammalian cell types. Not recognised by bacterial RNA polymerases.' },
      { name: 'MCS', kind: 'mcs', start: 12, end: 48, direction: 1,
        info: 'Multiple cloning site with sites for HindIII, BamHI, EcoRI, NotI, XhoI and others.' },
      { name: 'BGH polyA', kind: 'terminator', start: 55, end: 78, direction: 1,
        info: 'Bovine growth hormone polyadenylation signal. Provides efficient transcription termination and polyA tail addition in mammalian cells.' },
      { name: 'NeoR', kind: 'resistance', start: 105, end: 175, direction: 1,
        info: 'Neomycin resistance gene. Allows selection of stably transfected mammalian cells using G418.' },
      { name: 'AmpR', kind: 'resistance', start: 195, end: 265, direction: 1,
        info: 'Ampicillin resistance gene. Allows selection of transformed E. coli during plasmid propagation.' },
      { name: 'pUC ori', kind: 'ori', start: 285, end: 325, direction: 1,
        info: 'Origin of replication for high-copy propagation in E. coli.' }
    ]
  },
  'pEGFP-1': {
    name: 'pEGFP-1',
    sizeBp: 4200,
    description: 'Promoterless GFP reporter vector',
    features: [
      { name: 'MCS', kind: 'mcs', start: 345, end: 18, direction: 1,
        info: 'Multiple cloning site upstream of GFP. Designed to receive a candidate promoter. Contains EcoRI, BamHI, HindIII and others.' },
      { name: 'GFP', kind: 'reporter', start: 25, end: 90, direction: 1,
        info: 'Enhanced green fluorescent protein. Has no upstream promoter of its own — expression depends entirely on whatever you clone into the MCS.' },
      { name: 'SV40 polyA', kind: 'terminator', start: 96, end: 115, direction: 1,
        info: 'SV40 polyadenylation signal. Provides transcription termination after GFP.' },
      { name: 'KanR', kind: 'resistance', start: 145, end: 220, direction: 1,
        info: 'Kanamycin resistance gene. Allows selection of transformed E. coli on kanamycin plates.' },
      { name: 'pUC ori', kind: 'ori', start: 250, end: 320, direction: 1,
        info: 'Origin of replication for high-copy propagation in E. coli.' }
    ]
  },
  pUC19: {
    name: 'pUC19',
    sizeBp: 2686,
    description: 'General-purpose cloning vector',
    features: [
      // lacZα is split into two arcs flanking the MCS, reflecting that the
      // MCS is embedded within lacZα: cloning into the MCS disrupts the
      // β-galactosidase reading frame, producing white colonies on X-Gal.
      { name: 'lacZα', kind: 'reporter', start: 320, end: 355, direction: 1,
        info: 'N-terminal fragment of β-galactosidase (5′ portion). The MCS is embedded within lacZα: an insert in the MCS disrupts the reading frame, giving white colonies on X-Gal plates; intact (empty) vector gives blue colonies.' },
      { name: 'MCS', kind: 'mcs', start: 358, end: 22, direction: 1,
        info: 'Multiple cloning site embedded within lacZα. Contains EcoRI, BamHI, HindIII, SalI and others. Cloning into any of these sites disrupts lacZα expression.' },
      { name: 'lacZα (cont.)', kind: 'reporter', start: 25, end: 60, direction: 1,
        info: 'Continuation of the lacZα coding sequence after the MCS.' },
      { name: 'AmpR', kind: 'resistance', start: 110, end: 200, direction: 1,
        info: 'Ampicillin resistance gene for selection in E. coli.' },
      { name: 'pUC ori', kind: 'ori', start: 230, end: 320, direction: 1,
        info: 'High-copy origin of replication for E. coli.' }
    ]
  }
};

/* Helpers for circular geometry */
function degToRad(d) { return (d - 90) * Math.PI / 180; }
function pointOnCircle(cx, cy, r, deg) {
  const a = degToRad(deg);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
/* Arc length in degrees, handling wraparound through 0° */
function arcSpanDeg(start, end) {
  let span = end - start;
  if (span <= 0) span += 360;
  return span;
}
/* Midpoint of an arc, handling wraparound */
function arcMidDeg(start, end) {
  const span = arcSpanDeg(start, end);
  return (start + span / 2) % 360;
}

/* Build an SVG path for a thick arc segment with optional arrowhead at the
   forward end. The arc is drawn as an annulus segment (outer radius rOuter,
   inner radius rInner) with one end optionally tapered to a point.        */
function buildFeatureArcPath(cx, cy, rInner, rOuter, start, end, direction = 1, arrowhead = true) {
  const span = arcSpanDeg(start, end);
  const largeArc = span > 180 ? 1 : 0;

  // Reserve a small wedge at the leading end for the arrowhead
  const arrowDeg = arrowhead ? Math.min(6, span * 0.3) : 0;
  const tipDeg = direction === 1 ? end : start;
  const baseDeg = direction === 1 ? end - arrowDeg : start + arrowDeg;
  const bodyStart = direction === 1 ? start : baseDeg;
  const bodyEnd = direction === 1 ? baseDeg : end;
  const bodySpan = arcSpanDeg(bodyStart, bodyEnd);
  const bodyLargeArc = bodySpan > 180 ? 1 : 0;
  // Arc sweep direction — SVG sweep flag 1 = clockwise in user units
  // Our coordinate system has y-down so clockwise on screen = sweep 1
  const sweep = 1;

  const [x1Out, y1Out] = pointOnCircle(cx, cy, rOuter, bodyStart);
  const [x2Out, y2Out] = pointOnCircle(cx, cy, rOuter, bodyEnd);
  const [x1In, y1In] = pointOnCircle(cx, cy, rInner, bodyStart);
  const [x2In, y2In] = pointOnCircle(cx, cy, rInner, bodyEnd);

  if (!arrowhead) {
    return [
      `M ${x1Out} ${y1Out}`,
      `A ${rOuter} ${rOuter} 0 ${bodyLargeArc} ${sweep} ${x2Out} ${y2Out}`,
      `L ${x2In} ${y2In}`,
      `A ${rInner} ${rInner} 0 ${bodyLargeArc} ${1 - sweep} ${x1In} ${y1In}`,
      'Z'
    ].join(' ');
  }

  const rMid = (rInner + rOuter) / 2;
  const [tipX, tipY] = pointOnCircle(cx, cy, rMid, tipDeg);
  // Arrow base "wings" extend slightly beyond the body
  const wingOuter = rOuter + (rOuter - rInner) * 0.35;
  const wingInner = rInner - (rOuter - rInner) * 0.35;
  const [wxOut, wyOut] = pointOnCircle(cx, cy, wingOuter, baseDeg);
  const [wxIn, wyIn] = pointOnCircle(cx, cy, wingInner, baseDeg);

  if (direction === 1) {
    return [
      `M ${x1Out} ${y1Out}`,
      `A ${rOuter} ${rOuter} 0 ${bodyLargeArc} ${sweep} ${x2Out} ${y2Out}`,
      `L ${wxOut} ${wyOut}`,
      `L ${tipX} ${tipY}`,
      `L ${wxIn} ${wyIn}`,
      `L ${x2In} ${y2In}`,
      `A ${rInner} ${rInner} 0 ${bodyLargeArc} ${1 - sweep} ${x1In} ${y1In}`,
      'Z'
    ].join(' ');
  } else {
    return [
      `M ${x2Out} ${y2Out}`,
      `A ${rOuter} ${rOuter} 0 ${bodyLargeArc} ${1 - sweep} ${x1Out} ${y1Out}`,
      `L ${wxOut} ${wyOut}`,
      `L ${tipX} ${tipY}`,
      `L ${wxIn} ${wyIn}`,
      `L ${x1In} ${y1In}`,
      `A ${rInner} ${rInner} 0 ${bodyLargeArc} ${sweep} ${x2In} ${y2In}`,
      'Z'
    ].join(' ');
  }
}

/* For the MCS we want a small "notched" rectangle rather than an arrow */
function buildMcsBarPath(cx, cy, rInner, rOuter, start, end) {
  const span = arcSpanDeg(start, end);
  const largeArc = span > 180 ? 1 : 0;
  const [x1Out, y1Out] = pointOnCircle(cx, cy, rOuter, start);
  const [x2Out, y2Out] = pointOnCircle(cx, cy, rOuter, end);
  const [x1In, y1In] = pointOnCircle(cx, cy, rInner, start);
  const [x2In, y2In] = pointOnCircle(cx, cy, rInner, end);
  return [
    `M ${x1Out} ${y1Out}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Out} ${y2Out}`,
    `L ${x2In} ${y2In}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1In} ${y1In}`,
    'Z'
  ].join(' ');
}

/* Position a label outside the feature arc, with a leader line.
   Returns { labelX, labelY, anchorX, anchorY, textAnchor } */
function labelPlacement(cx, cy, rOuter, midDeg, leaderLen = 18) {
  const [anchorX, anchorY] = pointOnCircle(cx, cy, rOuter + 2, midDeg);
  const [labelX, labelY] = pointOnCircle(cx, cy, rOuter + leaderLen, midDeg);
  // Choose text-anchor based on which side of the circle we're on
  const a = ((midDeg % 360) + 360) % 360;
  let textAnchor = 'middle';
  if (a > 20 && a < 160) textAnchor = 'start';
  else if (a > 200 && a < 340) textAnchor = 'end';
  return { labelX, labelY, anchorX, anchorY, textAnchor };
}

/* The main plasmid-map component. Accepts a feature list and renders an
   interactive circular map. Hover (or tap) shows a tooltip with feature
   details. */
function PlasmidMap({
  title,
  sizeBp,
  features,
  size = 320,
  centreLabel = null,
  centreSubLabel = null,
  highlightFeature = null
}) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2;
  const cy = size / 2;
  const rBackbone = size * 0.32;
  const rOuter = rBackbone + size * 0.045;
  const rInner = rBackbone - size * 0.045;

  // Scale label leader to size
  const leaderLen = Math.max(12, size * 0.06);

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      width: size * 1.36,
      maxWidth: '100%'
    }}>
      <svg
        viewBox={`${-size * 0.18} ${-size * 0.05} ${size * 1.36} ${size * 1.1}`}
        width={size * 1.36}
        height={size * 1.1}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Plasmid map: ${title || 'plasmid'}`}
        style={{ display: 'block', overflow: 'visible', maxWidth: '100%', height: 'auto' }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Backbone circle */}
        <circle
          cx={cx} cy={cy} r={rBackbone}
          fill="none"
          stroke={PALETTE.borderStrong}
          strokeWidth={2}
        />

        {/* Subtle inner ring for depth */}
        <circle
          cx={cx} cy={cy} r={rBackbone - 1}
          fill="none"
          stroke={PALETTE.border}
          strokeWidth={1}
          opacity={0.5}
        />

        {/* Features */}
        {features.map((f, i) => {
          const colour = FEATURE_COLORS[f.colorOverride || f.kind] || FEATURE_COLORS.gene;
          const isHover = hovered === i;
          const isHighlight = highlightFeature && f.name === highlightFeature;
          const mid = arcMidDeg(f.start, f.end);
          const { labelX, labelY, anchorX, anchorY, textAnchor } =
            labelPlacement(cx, cy, rOuter, mid, leaderLen);

          let path;
          if (f.kind === 'mcs' || f.kind === 'terminator') {
            path = buildMcsBarPath(cx, cy, rInner, rOuter, f.start, f.end);
          } else if (f.kind === 'ori') {
            path = buildMcsBarPath(cx, cy, rInner + 4, rOuter - 4, f.start, f.end);
          } else {
            path = buildFeatureArcPath(cx, cy, rInner, rOuter, f.start, f.end, f.direction || 1, true);
          }

          // Slightly shorten labels for the map so they don't overlap
          const shortName = f.name.length > 14 ? f.name.slice(0, 13) + '…' : f.name;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onTouchStart={() => setHovered(hovered === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={path}
                fill={colour}
                opacity={isHover || isHighlight ? 1 : 0.92}
                stroke={isHover || isHighlight ? '#fff' : 'rgba(0,0,0,0.25)'}
                strokeWidth={isHover || isHighlight ? 1.5 : 0.5}
                style={{ transition: 'opacity 0.12s, stroke 0.12s' }}
              />
              {/* Leader line */}
              <line
                x1={anchorX} y1={anchorY}
                x2={labelX} y2={labelY}
                stroke={PALETTE.textMuted}
                strokeWidth={0.7}
                opacity={0.8}
              />
              {/* Always-visible short label */}
              <text
                x={labelX + (textAnchor === 'start' ? 3 : textAnchor === 'end' ? -3 : 0)}
                y={labelY + 4}
                textAnchor={textAnchor}
                fontFamily={FONT_BODY}
                fontSize={11}
                fill={isHover || isHighlight ? PALETTE.text : PALETTE.textDim}
                style={{
                  pointerEvents: 'none',
                  fontWeight: isHover || isHighlight ? 600 : 400,
                  transition: 'fill 0.12s'
                }}
              >
                {shortName}
              </text>
            </g>
          );
        })}

        {/* Centre label */}
        {centreLabel && (
          <text
            x={cx} y={cy - (centreSubLabel ? 4 : 2)}
            textAnchor="middle"
            fontFamily={FONT_DISPLAY}
            fontSize={Math.max(13, size * 0.05)}
            fontWeight={600}
            fill={PALETTE.text}
          >
            {centreLabel}
          </text>
        )}
        {centreSubLabel && (
          <text
            x={cx} y={cy + 14}
            textAnchor="middle"
            fontFamily={FONT_MONO}
            fontSize={Math.max(10, size * 0.035)}
            fill={PALETTE.textMuted}
          >
            {centreSubLabel}
          </text>
        )}
      </svg>

      {/* Tooltip — positioned absolutely over the SVG */}
      {hovered !== null && features[hovered] && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            background: 'rgba(13, 17, 23, 0.95)',
            border: `1px solid ${FEATURE_COLORS[features[hovered].colorOverride || features[hovered].kind] || FEATURE_COLORS.gene}`,
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 13,
            color: PALETTE.text,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 5
          }}
        >
          <div style={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 14,
            color: FEATURE_COLORS[features[hovered].colorOverride || features[hovered].kind] || FEATURE_COLORS.gene,
            marginBottom: 4
          }}>
            {features[hovered].name}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: PALETTE.text }}>
            {features[hovered].info}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- Constructed-plasmid feature builder -----
   Given a starting vector and the simulation choices, returns a feature list
   that represents the construct that was actually built. The MCS is replaced
   (or partially replaced) by an insert feature whose properties depend on:
     - whether an insert was obtained at all
     - whether the ligation succeeded (otherwise the MCS remains, possibly empty)
     - whether the insert contains introns
     - whether orientation is correct
*/
function buildConstructFeatures(c) {
  const vectorMap = VECTOR_MAPS[c.vector];
  if (!vectorMap) return null;

  const insertObtained = computeInsertObtained(c);
  const ligationOk = computeLigationSuccess(c);
  const orientationOk = computeOrientationCorrect(c);
  const introns = computeInsertHasIntrons(c);

  // For each MCS, find the start of the next feature (so we can cap insert
  // size without overlapping). Helper: given the index of the MCS in the
  // feature list, return the angular distance to the next feature's start.
  function gapAfter(features, idx) {
    const f = features[idx];
    let nearest = 360;
    for (let j = 0; j < features.length; j++) {
      if (j === idx) continue;
      const other = features[j];
      let d = other.start - f.start;
      while (d <= 0) d += 360;
      if (d < nearest) nearest = d;
    }
    return nearest;
  }

  // Find the MCS and replace it with the insert (or leave it if no insert)
  const features = [];
  vectorMap.features.forEach((f, idx) => {
    if (f.kind === 'mcs' && insertObtained && ligationOk) {
      // Decide insert label and colour
      const insertName = c.goal === 'A' ? (introns ? 'INS gDNA' : 'INS cDNA')
                       : c.goal === 'B' ? 'luxAB'
                       : 'ALB promoter';
      const insertInfo =
        introns
          ? 'The cloned fragment contains the human INS coding sequence interrupted by two introns. E. coli does not splice introns, so any transcript made from this construct will retain the intronic sequence and will not produce functional insulin.'
        : (c.goal === 'A' ? 'The cloned human INS coding sequence (cDNA), positioned downstream of the vector promoter and ready to be transcribed and translated.'
        : c.goal === 'B' ? 'The bacterial luxAB operon, positioned downstream of the vector promoter.'
        : 'The cloned human albumin promoter region. Whether this drives downstream expression depends on the vector and host cell context.');

      // Insert occupies an arc proportional to its size, but capped so it
      // never overlaps with neighbouring features.
      const baseSpan = arcSpanDeg(f.start, f.end);
      const sizeRatio = Math.min(2.4, Math.max(0.7, expectedInsertSize(c) / 600));
      const desiredSpan = baseSpan * sizeRatio;
      const maxSpanFromGap = gapAfter(vectorMap.features, idx) - 4; // 4° gap to next feature
      const insertSpan = Math.max(8, Math.min(desiredSpan, maxSpanFromGap));
      const start = f.start;
      const end = (start + insertSpan) % 360;

      const direction = orientationOk ? 1 : -1;
      const colorOverride = introns ? 'insert_problem' : 'insert';

      features.push({
        name: insertName,
        kind: 'insert',
        colorOverride,
        start,
        end,
        direction,
        info: insertInfo + (orientationOk ? '' :
          ' This insert is ligated in the reverse orientation relative to the vector promoter.')
      });
    } else if (f.kind === 'mcs' && (!insertObtained || !ligationOk)) {
      // Empty vector — keep the MCS visible
      features.push({
        ...f,
        info: f.info + ' No insert is present in this construct — the vector closed back on itself or no insert was generated upstream.'
      });
    } else {
      features.push(f);
    }
  });

  return features;
}

/* ============================================================================
   UI primitives
   ========================================================================= */

const STYLES = {
  app: {
    minHeight: '100%',
    background: PALETTE.bg,
    color: PALETTE.text,
    fontFamily: FONT_BODY,
    fontSize: 18,
    paddingBottom: 80
  },
  shell: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '24px 24px 40px'
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 16,
    borderBottom: `1px solid ${PALETTE.border}`,
    marginBottom: 28
  },
  brandTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: 600,
    fontSize: 28,
    letterSpacing: '-0.01em',
    color: PALETTE.text,
    margin: 0,
    fontVariationSettings: '"opsz" 40'
  },
  brandSubtitle: {
    color: PALETTE.textDim,
    fontSize: 15,
    marginTop: 2
  },
  metricRow: {
    display: 'flex',
    gap: 12
  },
  metricBadge: {
    background: PALETTE.bgPanel,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 8,
    padding: '8px 14px',
    minWidth: 84,
    textAlign: 'center'
  },
  metricLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: PALETTE.textMuted,
    fontFamily: FONT_MONO
  },
  metricValue: {
    fontSize: 20,
    fontFamily: FONT_MONO,
    color: PALETTE.text,
    fontWeight: 500
  },
  panel: {
    background: PALETTE.bgPanel,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 12,
    padding: 28
  },
  panelHeading: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: 600,
    margin: '0 0 8px',
    color: PALETTE.text,
    fontVariationSettings: '"opsz" 30'
  },
  question: {
    fontSize: 19,
    color: PALETTE.text,
    margin: '0 0 22px'
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  optionButton: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    width: '100%',
    textAlign: 'left',
    padding: '16px 18px',
    background: PALETTE.bgPanelAlt,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 10,
    color: PALETTE.text,
    fontSize: 18,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s, transform 0.05s'
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: 500,
    color: PALETTE.text,
    marginBottom: 4
  },
  optionDetail: {
    fontSize: 15,
    color: PALETTE.textDim,
    lineHeight: 1.5
  },
  optionMeta: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    color: PALETTE.textMuted,
    marginTop: 6,
    letterSpacing: '0.02em'
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 28px',
    background: PALETTE.accent,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: FONT_BODY
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '12px 22px',
    background: 'transparent',
    color: PALETTE.text,
    border: `1px solid ${PALETTE.borderStrong}`,
    borderRadius: 8,
    fontSize: 17,
    cursor: 'pointer',
    fontFamily: FONT_BODY
  }
};

/* --------------------------- Info button + modal -------------------------- */

function InfoButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Show concept information"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 999,
        background: PALETTE.accentSoft,
        border: `1px solid ${PALETTE.accent}`,
        color: PALETTE.accentBright,
        fontFamily: FONT_DISPLAY,
        fontSize: 18,
        fontWeight: 600,
        fontStyle: 'italic',
        cursor: 'pointer',
        marginLeft: 12,
        verticalAlign: 'middle',
        flexShrink: 0
      }}
    >
      i
    </button>
  );
}

function InfoModal({ open, onClose, title, body }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 12, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
        backdropFilter: 'blur(2px)'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 620,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: PALETTE.bgPanel,
          border: `1px solid ${PALETTE.borderStrong}`,
          borderRadius: 12,
          padding: '28px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <h3 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 24,
            fontWeight: 600,
            color: PALETTE.accentBright,
            margin: 0
          }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: PALETTE.textDim,
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
          >×</button>
        </div>
        <div style={{
          marginTop: 18,
          fontSize: 17,
          lineHeight: 1.65,
          color: PALETTE.text,
          whiteSpace: 'pre-line'
        }}>
          {body}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Progress bar ------------------------------- */

function ProgressBar({ currentStep, choices }) {
  // currentStep is 0..6 where 0 = goal selection and 6 = post-validation.
  // Steps shown are the 6 decisions; we render dots for each.
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 26,
      flexWrap: 'wrap'
    }}>
      {DECISIONS.map((dec, i) => {
        const stepNum = i + 1;
        const done = currentStep > stepNum || choices[dec.id] !== undefined;
        const active = currentStep === stepNum;
        return (
          <div key={dec.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 76 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT_MONO,
                fontSize: 14,
                fontWeight: 500,
                background: done ? PALETTE.accent : (active ? PALETTE.accentSoft : PALETTE.bgPanel),
                color: done ? '#fff' : (active ? PALETTE.accentBright : PALETTE.textMuted),
                border: `1px solid ${active || done ? PALETTE.accent : PALETTE.border}`
              }}>
                {done ? '✓' : stepNum}
              </div>
              <div style={{
                fontSize: 12,
                color: active ? PALETTE.accentBright : PALETTE.textMuted,
                fontFamily: FONT_BODY,
                textAlign: 'center'
              }}>{dec.shortLabel}</div>
            </div>
            {i < DECISIONS.length - 1 && (
              <div style={{
                height: 1,
                width: 18,
                background: done ? PALETTE.accent : PALETTE.border,
                marginBottom: 18
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Top bar ----------------------------------- */

function TopBar({ time, cost, goal }) {
  return (
    <div style={STYLES.topBar}>
      <div>
        <h1 style={STYLES.brandTitle}>Cloning Strategy Simulation</h1>
        <div style={STYLES.brandSubtitle}>
          {goal ? `Project: ${GOALS[goal].title}` : 'Plan a molecular cloning experiment from start to finish'}
        </div>
      </div>
      <div style={STYLES.metricRow}>
        <div style={STYLES.metricBadge}>
          <div style={STYLES.metricLabel}>Time</div>
          <div style={STYLES.metricValue}>{time} d</div>
        </div>
        <div style={STYLES.metricBadge}>
          <div style={STYLES.metricLabel}>Cost</div>
          <div style={STYLES.metricValue}>${cost}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Screen components
   ========================================================================= */

/* -------------------------- Intro / goal select -------------------------- */

function IntroScreen({ onSelectGoal }) {
  return (
    <div style={STYLES.panel}>
      <h2 style={STYLES.panelHeading}>Welcome to the lab</h2>
      <p style={{ fontSize: 18, color: PALETTE.text, marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
        You are about to plan and execute a molecular cloning experiment. You will make a series
        of decisions about how to obtain your insert, design your primers, choose a vector,
        cut and join your DNA, and validate your final construct.
      </p>
      <p style={{ fontSize: 17, color: PALETTE.textDim, marginTop: 0, marginBottom: 28, lineHeight: 1.6 }}>
        Some of your choices will only reveal their consequences several steps later — just as
        in a real lab. An info button on each step explains the underlying concepts so you can
        reason your way through. Choose your project to begin.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {Object.values(GOALS).map(g => (
          <button
            key={g.id}
            onClick={() => onSelectGoal(g.id)}
            style={{
              textAlign: 'left',
              padding: '22px 22px 24px',
              background: PALETTE.bgPanelAlt,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 12,
              color: PALETTE.text,
              cursor: 'pointer',
              fontFamily: FONT_BODY,
              transition: 'border-color 0.15s, transform 0.08s, background 0.15s',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = g.accent;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = PALETTE.border;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: g.accent
            }} />
            <div style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: g.accent,
              fontFamily: FONT_MONO,
              marginBottom: 8,
              marginTop: 4
            }}>
              Project {g.id}
            </div>
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 8,
              lineHeight: 1.2,
              color: PALETTE.text
            }}>
              {g.title}
            </div>
            <div style={{
              fontSize: 15,
              color: PALETTE.textDim,
              marginBottom: 14,
              fontStyle: 'italic'
            }}>
              {g.subtitle}
            </div>
            <div style={{ fontSize: 15, color: PALETTE.text, lineHeight: 1.55 }}>
              {g.body}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Generic decision screen ------------------------ */

function DecisionScreen({ decision, onChoose }) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div style={STYLES.panel}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: PALETTE.accentBright,
        fontFamily: FONT_MONO,
        marginBottom: 6
      }}>
        Step {decision.stepNumber} of {DECISIONS.length} · {decision.shortLabel}
      </div>
      <h2 style={{ ...STYLES.panelHeading, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {decision.title}
        <InfoButton onClick={() => setInfoOpen(true)} />
      </h2>
      <p style={STYLES.question}>{decision.question}</p>

      <div style={STYLES.optionList}>
        {decision.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChoose(opt)}
            style={STYLES.optionButton}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = PALETTE.accent;
              e.currentTarget.style.background = PALETTE.accentSoft;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = PALETTE.border;
              e.currentTarget.style.background = PALETTE.bgPanelAlt;
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={STYLES.optionLabel}>{opt.label}</div>
              <div style={STYLES.optionDetail}>{opt.detail}</div>
              <div style={STYLES.optionMeta}>
                +{opt.time} {opt.time === 1 ? 'day' : 'days'} · +${opt.cost}
              </div>
            </div>
            <div style={{
              fontSize: 22,
              color: PALETTE.textMuted,
              alignSelf: 'center'
            }}>›</div>
          </button>
        ))}
      </div>

      <InfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={decision.info.title}
        body={decision.info.body}
      />
    </div>
  );
}

/* ----------------------- Vector-selection screen -------------------------- */
/* Specialised version of the decision screen for Step 4: presents each
   vector option as an interactive plasmid map with hover-tooltip features. */

function VectorSelectionScreen({ decision, onChoose }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const optionsWithMaps = decision.options.map(opt => {
    const vmap = VECTOR_MAPS[opt.value];
    return { ...opt, vmap };
  });

  const selectedOption = optionsWithMaps.find(o => o.value === selected);

  return (
    <div style={STYLES.panel}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: PALETTE.accentBright,
        fontFamily: FONT_MONO,
        marginBottom: 6
      }}>
        Step {decision.stepNumber} of {DECISIONS.length} · {decision.shortLabel}
      </div>
      <h2 style={{ ...STYLES.panelHeading, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {decision.title}
        <InfoButton onClick={() => setInfoOpen(true)} />
      </h2>
      <p style={STYLES.question}>
        {decision.question} Hover over each feature to see what it does. Click a map to select that vector.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 18
      }}>
        {optionsWithMaps.map(opt => {
          const isSelected = selected === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              style={{
                background: isSelected ? PALETTE.accentSoft : PALETTE.bgPanelAlt,
                border: `1.5px solid ${isSelected ? PALETTE.accent : PALETTE.border}`,
                borderRadius: 12,
                padding: '18px 16px 14px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.borderColor = PALETTE.borderStrong;
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.borderColor = PALETTE.border;
              }}
            >
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                color: PALETTE.text,
                marginBottom: 2,
                alignSelf: 'flex-start'
              }}>
                {opt.vmap.name}
              </div>
              <div style={{
                fontSize: 13,
                color: PALETTE.textDim,
                marginBottom: 8,
                alignSelf: 'flex-start'
              }}>
                {opt.vmap.description}
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <PlasmidMap
                  title={opt.vmap.name}
                  sizeBp={opt.vmap.sizeBp}
                  features={opt.vmap.features}
                  size={260}
                  centreLabel={opt.vmap.name}
                  centreSubLabel={`${opt.vmap.sizeBp} bp`}
                />
              </div>

              <div style={{
                marginTop: 10,
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: PALETTE.textMuted,
                alignSelf: 'flex-start'
              }}>
                +{opt.time} {opt.time === 1 ? 'day' : 'days'} · +${opt.cost}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 6
      }}>
        <div style={{ fontSize: 15, color: PALETTE.textDim }}>
          {selected
            ? <span>Selected: <strong style={{ color: PALETTE.text }}>{selectedOption.vmap.name}</strong></span>
            : <span>Select a vector to continue.</span>}
        </div>
        <button
          disabled={!selected}
          onClick={() => onChoose(selectedOption)}
          style={{
            ...STYLES.primaryButton,
            opacity: selected ? 1 : 0.4,
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          Use this vector
        </button>
      </div>

      <InfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={decision.info.title}
        body={decision.info.body}
      />
    </div>
  );
}

function PlateResultScreen({ choices, onContinue }) {
  const plateState = computePlateState(choices);

  // Neutral observational descriptions — no judgement.
  const descriptions = {
    lawn:
      'Your transformation has yielded a healthy lawn of colonies on the selection plate. ' +
      'The plate is densely populated with similarly sized colonies.',
    sparse:
      'Your transformation has produced a small number of colonies on the selection plate — ' +
      'fewer than is typical for a sticky-end ligation.',
    empty:
      'Your transformation has produced essentially no colonies on the selection plate.',
    background:
      'A few small colonies are visible on the selection plate. Their appearance is consistent ' +
      'with low-level background growth rather than a typical successful transformation.',
    pUC_white:
      'Your transformation has yielded many colonies on X-Gal/IPTG plates. The vast majority ' +
      'are white, with a small number of blue colonies scattered across the plate.',
    pUC_white_sparse:
      'Your transformation has produced a small number of colonies on X-Gal/IPTG plates. ' +
      'Most of the colonies present are white.',
    pUC_blue:
      'Your transformation has yielded many colonies on X-Gal/IPTG plates. The vast majority ' +
      'are blue, with only a few white colonies.'
  };

  const seed = `${choices.goal}|${choices.source}|${choices.template}|${choices.primers}|${choices.vector}|${choices.re}`;

  return (
    <div style={STYLES.panel}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: PALETTE.accentBright,
        fontFamily: FONT_MONO,
        marginBottom: 6
      }}>
        Checkpoint · Transformation plate
      </div>
      <h2 style={STYLES.panelHeading}>You inspect your plate</h2>
      <p style={STYLES.question}>
        After transforming your ligation reaction into competent cells and plating overnight,
        you observe the following plate.
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        flexWrap: 'wrap',
        background: PALETTE.bgPanelAlt,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 26
      }}>
        <div style={{ flexShrink: 0 }}>
          <PetriDish plateState={plateState} seed={seed} />
        </div>
        <div style={{ flex: 1, minWidth: 240, fontSize: 17, color: PALETTE.text, lineHeight: 1.6 }}>
          {descriptions[plateState]}
        </div>
      </div>

      <button onClick={onContinue} style={STYLES.primaryButton}>
        Pick colonies and proceed to validation
      </button>
    </div>
  );
}

/* ------------------------ Validation result screen ------------------------ */

function ValidationResultScreen({ choices, onContinue }) {
  const insertObtained = computeInsertObtained(choices);
  const ligationOk = computeLigationSuccess(choices);
  const introns = computeInsertHasIntrons(choices);
  const orientationOk = computeOrientationCorrect(choices);
  const expectedSize = expectedInsertSize(choices);
  const observedInsertSize = insertObtained && ligationOk
    ? (introns ? INSERT_SIZES.A.gdna : expectedSize)
    : null;
  const expectedNoIntrons = choices.goal === 'A' ? INSERT_SIZES.A.cdna : expectedSize;

  function renderColonyPCR() {
    const observedBand = colonyPcrBandSize(choices);
    const expectedBand = (choices.goal === 'A' ? INSERT_SIZES.A.cdna : expectedSize) + 200;
    const lanes = [
      { label: 'Colony 1', bands: [{ sizeBp: observedBand, intensity: 0.95, thick: true }] },
      { label: 'Colony 2', bands: [{ sizeBp: observedBand, intensity: 0.9, thick: true }] }
    ];

    return (
      <div>
        <GelImage lanes={lanes} title="Colony PCR result" />
        <div style={{
          marginTop: 14,
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: PALETTE.textDim
        }}>
          Expected band size if insert is present and well-formed:{' '}
          <span style={{ color: PALETTE.text }}>~{expectedBand} bp</span>
          {'  ·  '}
          Observed band size:{' '}
          <span style={{ color: PALETTE.text }}>~{observedBand} bp</span>
        </div>
      </div>
    );
  }

  function renderDigest() {
    const backbone = VECTOR_BACKBONE[choices.vector];
    const lanes = [];

    if (!insertObtained || !ligationOk) {
      // Empty vector → linearised backbone only
      lanes.push({ label: 'Uncut', bands: [{ sizeBp: backbone, intensity: 0.6 }] });
      lanes.push({ label: 'Cut', bands: [{ sizeBp: backbone, intensity: 0.95, thick: true }] });
    } else {
      const insertBand = introns ? INSERT_SIZES.A.gdna : expectedSize;
      lanes.push({
        label: 'Uncut',
        bands: [{ sizeBp: backbone + insertBand, intensity: 0.6 }]
      });
      lanes.push({
        label: 'Cut',
        bands: [
          { sizeBp: backbone, intensity: 0.95, thick: true },
          { sizeBp: insertBand, intensity: 0.9, thick: true }
        ]
      });
    }

    return (
      <div>
        <GelImage lanes={lanes} title="Diagnostic digest" />
        <div style={{
          marginTop: 14,
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: PALETTE.textDim,
          lineHeight: 1.6
        }}>
          Expected fragment sizes (vector + correctly cloned insert):{' '}
          <span style={{ color: PALETTE.text }}>~{backbone} bp + ~{expectedNoIntrons} bp</span>
        </div>
      </div>
    );
  }

  function renderSequencing() {
    let lines = [];
    if (insertObtained && ligationOk && !introns && orientationOk && computeVectorCompatible(choices)) {
      const targetName = choices.goal === 'A' ? 'human INS coding sequence' :
                         choices.goal === 'B' ? 'V. harveyi luxAB operon' :
                         'human ALB promoter region';
      const orientationContext = choices.goal === 'C'
        ? 'in the forward orientation upstream of GFP'
        : `in the forward orientation downstream of the ${choices.vector === 'pET28a' ? 'T7' : 'CMV'} promoter`;
      lines.push({ label: 'Identity', text: `Match: ${targetName}.`, ok: true });
      lines.push({ label: 'Orientation', text: `Insert is ${orientationContext}.`, ok: true });
      lines.push({ label: 'Sequence integrity', text: 'No mutations, indels or unexpected sequence detected.', ok: true });
    } else {
      // Various failure cases
      if (!insertObtained || !ligationOk) {
        lines.push({ label: 'Identity', text: 'No insert detected. Sequence corresponds to empty vector backbone with intact MCS.', ok: false });
      } else {
        const targetName = choices.goal === 'A' ? 'human INS coding sequence' :
                           choices.goal === 'B' ? 'V. harveyi luxAB operon' :
                           'human ALB promoter region';
        lines.push({ label: 'Identity', text: `Match: ${targetName}.`, ok: true });

        if (introns) {
          lines.push({
            label: 'Sequence integrity',
            text: 'Coding regions are present but interrupted by two non-coding stretches that disrupt the open reading frame.',
            ok: false
          });
        } else {
          lines.push({ label: 'Sequence integrity', text: 'No mutations, indels or unexpected sequence detected within the insert.', ok: true });
        }

        if (orientationOk === false) {
          const refPoint = choices.goal === 'C' ? 'GFP coding sequence' : 'vector promoter';
          lines.push({
            label: 'Orientation',
            text: `Insert is in the reverse orientation relative to the ${refPoint}.`,
            ok: false
          });
        } else if (orientationOk === true) {
          const orientationContext = choices.goal === 'C'
            ? 'in the forward orientation upstream of GFP'
            : `in the forward orientation downstream of the ${choices.vector === 'pET28a' ? 'T7' : choices.vector === 'pcDNA3.1' ? 'CMV' : 'vector'} promoter`;
          lines.push({ label: 'Orientation', text: `Insert is ${orientationContext}.`, ok: true });
        }
      }
    }

    return (
      <div style={{
        background: '#0a0d12',
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
        padding: '20px 22px',
        fontFamily: FONT_MONO,
        fontSize: 14,
        lineHeight: 1.7
      }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, textTransform: 'uppercase',
                       letterSpacing: '0.1em', color: PALETTE.textMuted, marginBottom: 10 }}>
          Sanger sequencing report
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 18,
              color: l.ok ? PALETTE.success : PALETTE.warning,
              fontWeight: 600
            }}>{l.ok ? '✓' : '!'}</div>
            <div>
              <span style={{ color: PALETTE.textDim }}>{l.label}:</span>{' '}
              <span style={{ color: PALETTE.text }}>{l.text}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSkip() {
    return (
      <div style={{
        background: PALETTE.bgPanelAlt,
        border: `1px dashed ${PALETTE.border}`,
        borderRadius: 8,
        padding: '24px 28px',
        color: PALETTE.textDim,
        fontStyle: 'italic'
      }}>
        You did not perform any validation. You proceed directly to using your construct.
      </div>
    );
  }

  let body;
  let label;
  switch (choices.validation) {
    case 'colony_pcr':
      body = renderColonyPCR();
      label = 'Colony PCR result';
      break;
    case 'digest':
      body = renderDigest();
      label = 'Diagnostic digest result';
      break;
    case 'sequencing':
      body = renderSequencing();
      label = 'Sequencing report';
      break;
    case 'skip':
    default:
      body = renderSkip();
      label = 'No validation performed';
      break;
  }

  return (
    <div style={STYLES.panel}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: PALETTE.accentBright,
        fontFamily: FONT_MONO,
        marginBottom: 6
      }}>
        Checkpoint · {label}
      </div>
      <h2 style={STYLES.panelHeading}>Validation readout</h2>

      <div style={{
        background: PALETTE.bgPanelAlt,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 26,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 280
      }}>
        {body}
      </div>

      <button onClick={onContinue} style={STYLES.primaryButton}>
        Conclude experiment and view summary
      </button>
    </div>
  );
}

/* ============================================================================
   Debrief generation
   ----------------------------------------------------------------------------
   For each decision, returns:
     status: 'correct' | 'workable' | 'incorrect' | 'unknown'
     note:   one-sentence pedagogical explanation
   ========================================================================= */

function debriefSource(c) {
  if (c.goal === 'A') {
    if (c.source === 'mRNA') return { status: 'correct',
      note: 'mRNA is the correct source for a eukaryotic coding sequence — splicing has already removed the introns.' };
    return { status: 'incorrect',
      note: 'Genomic DNA contains introns. E. coli has no splicing machinery, so the introns will remain in any transcribed mRNA.' };
  }
  if (c.goal === 'B') {
    if (c.source === 'gDNA') return { status: 'correct',
      note: 'Bacterial genes do not contain introns, so genomic DNA is a perfectly good source.' };
    return { status: 'workable',
      note: 'Bacterial mRNA can also work, provided you use a priming strategy that does not depend on a poly-A tail.' };
  }
  // Goal C
  if (c.source === 'gDNA') return { status: 'correct',
    note: 'Promoters are regulatory regions of genomic DNA — they are not transcribed and so are not represented in mRNA.' };
  return { status: 'incorrect',
    note: 'Promoter sequences are not transcribed, so they are absent from any mRNA pool. cDNA derived from mRNA cannot contain a promoter.' };
}

function debriefTemplate(c) {
  if (c.source === 'gDNA') {
    if (c.template === 'direct_pcr') return { status: 'correct',
      note: 'Direct PCR is the right choice when starting from a DNA template — DNA polymerases use DNA as a template directly.' };
    return { status: 'incorrect',
      note: 'Reverse transcription requires an RNA template; it cannot be performed on genomic DNA.' };
  }
  // mRNA source
  if (c.template === 'direct_pcr') return { status: 'incorrect',
    note: 'PCR polymerases such as Taq cannot use RNA as a template. Reverse transcription into cDNA must come first.' };

  // RT priming choices, evaluated in the context of the goal/source organism
  if (c.template === 'rt_oligodt') {
    if (c.goal === 'A') return { status: 'correct',
      note: 'Eukaryotic mRNA is polyadenylated, so oligo-dT primers anneal to the poly-A tail and prime cDNA synthesis.' };
    if (c.goal === 'B') return { status: 'incorrect',
      note: 'Bacterial mRNA is not polyadenylated, so oligo-dT primers have nowhere to anneal.' };
    if (c.goal === 'C') return { status: 'incorrect',
      note: 'Even if oligo-dT priming worked, the albumin promoter is not present in any mRNA, so cDNA cannot contain it.' };
  }
  if (c.template === 'rt_random') {
    if (c.goal === 'A') return { status: 'workable',
      note: 'Random hexamers prime cDNA synthesis on any RNA, including poly-A+ eukaryotic mRNA.' };
    if (c.goal === 'B') return { status: 'correct',
      note: 'Random hexamers do not require a poly-A tail and so can prime cDNA synthesis from bacterial mRNA.' };
    if (c.goal === 'C') return { status: 'incorrect',
      note: 'Random hexamers will produce cDNA, but the albumin promoter is not transcribed and so is not in the mRNA pool.' };
  }
  return { status: 'unknown', note: '' };
}

function debriefPrimers(c) {
  // Compatible with chosen RE strategy?
  const ligated = computeLigationSuccess(c);
  if (ligated === true) {
    if (c.primers === 'different_sites' && c.re === 'double_eco_bam') {
      return { status: 'correct',
        note: 'Different restriction sites on each primer enable directional cloning when paired with a double digest of the vector.' };
    }
    if (c.primers === 'same_site') return { status: 'workable',
      note: 'Identical sites on both primers allow ligation but the insert can go in either orientation.' };
    if (c.primers === 'plain') return { status: 'workable',
      note: 'Without engineered sites the only option is blunt-end ligation, which is non-directional.' };
  }
  if (ligated === false) {
    if (c.primers === 'plain') return { status: 'incorrect',
      note: 'No restriction sites were added to the insert, so the insert ends are not compatible with the digested vector.' };
    if (c.primers === 'same_site' && c.re === 'double_eco_bam') return { status: 'incorrect',
      note: 'The insert carries identical EcoRI sites on both ends, but the vector was cut with two different enzymes — the ends do not match.' };
    if (c.primers === 'different_sites' && c.re === 'single_eco') return { status: 'incorrect',
      note: 'Only one of the two engineered restriction sites matches the single-enzyme vector cut, so only one end of the insert can ligate.' };
  }
  return { status: 'unknown', note: '' };
}

function debriefVector(c) {
  const correct = { A: 'pET28a', B: 'pcDNA3.1', C: 'pEGFP-1' };
  if (c.vector === correct[c.goal]) {
    if (c.goal === 'A') return { status: 'correct',
      note: 'pET28a carries a T7 promoter that drives high-level inducible expression in suitable E. coli strains.' };
    if (c.goal === 'B') return { status: 'correct',
      note: 'pcDNA3.1 carries a CMV promoter that drives constitutive expression in mammalian cells.' };
    return { status: 'correct',
      note: 'pEGFP-1 has no promoter of its own, so the only driver of GFP is whatever you clone into its MCS.' };
  }

  if (c.vector === 'pET28a') return { status: 'incorrect',
    note: c.goal === 'B'
      ? 'The T7 promoter is only recognised by T7 RNA polymerase, which is not present in mammalian cells.'
      : 'pET28a is a bacterial expression vector — its components are not suited to a reporter assay.' };

  if (c.vector === 'pcDNA3.1') return { status: 'incorrect',
    note: c.goal === 'A'
      ? 'The CMV promoter is a mammalian promoter and is not active in E. coli.'
      : 'pcDNA3.1 has its own constitutive CMV promoter, which would drive your reporter regardless of any tissue-specific promoter you cloned in.' };

  if (c.vector === 'pEGFP-1') return { status: 'incorrect',
    note: 'pEGFP-1 carries the GFP coding sequence in place of any insert you might want to express, and has no promoter to drive expression of your gene.' };

  if (c.vector === 'pUC19') return { status: 'incorrect',
    note: 'pUC19 has no promoter or expression cassette of any kind — it is a general-purpose cloning vector, not an expression vector.' };

  return { status: 'unknown', note: '' };
}

function debriefRE(c) {
  const ligated = computeLigationSuccess(c);
  const directional = c.primers === 'different_sites' && c.re === 'double_eco_bam';

  if (ligated === true) {
    if (directional) return { status: 'correct',
      note: 'A double digest with two different sticky-end enzymes forces the insert to ligate in only one orientation.' };
    if (c.re === 'blunt') return { status: 'workable',
      note: 'Blunt-end ligation works with any insert ends but is markedly less efficient and non-directional.' };
    if (c.re === 'single_eco') return { status: 'workable',
      note: 'A single-enzyme strategy works when the insert has matching ends, but the insert can ligate in either orientation.' };
  } else if (ligated === false) {
    return { status: 'incorrect',
      note: 'The chosen vector cuts and the chosen primer-encoded ends are not mutually compatible, so the ligation could not proceed.' };
  }
  return { status: 'unknown', note: '' };
}

function debriefValidation(c) {
  const insert = computeInsertObtained(c);
  const lig = computeLigationSuccess(c);
  const introns = computeInsertHasIntrons(c);
  const directional = c.primers === 'different_sites' && c.re === 'double_eco_bam';

  if (c.validation === 'skip') return { status: 'incorrect',
    note: 'Without any validation, you have no information about whether your construct contains the correct insert.' };

  if (c.validation === 'colony_pcr') {
    if (!insert || !lig) return { status: 'workable',
      note: 'Colony PCR with vector-flanking primers will distinguish between empty vector and one carrying an insert of the expected size.' };
    if (introns) return { status: 'workable',
      note: 'Colony PCR detected a band, but the band size differed from what was expected — a clue that your insert may not be the sequence you intended.' };
    if (!directional) return { status: 'workable',
      note: 'Colony PCR confirmed an insert was present at the expected size, but it cannot detect the orientation of a non-directional clone.' };
    return { status: 'correct',
      note: 'Colony PCR is a fast, low-cost confirmation that an insert of the expected size is present.' };
  }

  if (c.validation === 'digest') {
    if (!insert || !lig) return { status: 'workable',
      note: 'A diagnostic digest distinguishes empty vector from a construct carrying an insert.' };
    if (introns) return { status: 'workable',
      note: 'The digest fragment sizes did not match expectation — a clue that your insert was not the sequence you intended to clone.' };
    if (!directional) return { status: 'workable',
      note: 'The digest confirmed insert size, but the symmetric pattern cannot resolve orientation in a non-directional clone.' };
    return { status: 'correct',
      note: 'Diagnostic digest gives both insert presence and size in one experiment.' };
  }

  if (c.validation === 'sequencing') {
    return { status: 'correct',
      note: 'Sanger sequencing is the most informative validation: it reveals insert identity, orientation, and any sequence anomalies such as introns or mutations.' };
  }
  return { status: 'unknown', note: '' };
}

const DEBRIEF_FUNCTIONS = {
  source: debriefSource,
  template: debriefTemplate,
  primers: debriefPrimers,
  vector: debriefVector,
  re: debriefRE,
  validation: debriefValidation
};

const STATUS_COLORS = {
  correct: { color: PALETTE.success, label: 'Optimal', bg: 'rgba(63,185,80,0.10)' },
  workable: { color: PALETTE.warning, label: 'Not optimal', bg: 'rgba(210,153,34,0.10)' },
  incorrect: { color: PALETTE.danger, label: 'Issue', bg: 'rgba(248,81,73,0.10)' },
  unknown: { color: PALETTE.textMuted, label: '—', bg: 'transparent' }
};

/* ----------------------------- End screen --------------------------------- */

function EndScreen({ choices, time, cost, onRestart }) {
  const goal = GOALS[choices.goal];
  const success = computeFinalSuccess(choices);

  const successMessages = {
    A: 'Sequencing of your construct confirms an intact human INS coding sequence cloned in the forward orientation downstream of the T7 promoter in pET28a. Your construct is ready for IPTG-induced expression in BL21(DE3) E. coli to produce recombinant insulin.',
    B: 'Sequencing of your construct confirms the V. harveyi luxAB operon cloned in the forward orientation downstream of the CMV promoter in pcDNA3.1. Your construct is ready for transfection into mammalian cell lines.',
    C: 'Sequencing of your construct confirms the human albumin promoter cloned in the forward orientation upstream of GFP in pEGFP-1. Your construct is ready to test tissue-specific expression by comparing GFP fluorescence in liver-derived (HepG2) versus non-hepatic cell lines.'
  };

  const debriefRows = DECISIONS.map(dec => {
    const fn = DEBRIEF_FUNCTIONS[dec.id];
    const result = fn ? fn(choices) : { status: 'unknown', note: '' };
    return {
      decision: dec,
      choiceLabel: formatChoiceLabel(dec.id, choices[dec.id]),
      ...result
    };
  });

  return (
    <div style={STYLES.panel}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: success ? PALETTE.success : PALETTE.warning,
        fontFamily: FONT_MONO,
        marginBottom: 6
      }}>
        Experiment summary · {success ? 'Success' : 'Outcome did not meet objective'}
      </div>
      <h2 style={STYLES.panelHeading}>
        {success ? 'Your construct works.' : 'Your construct will not give the result you wanted.'}
      </h2>

      <div style={{
        background: success ? 'rgba(63,185,80,0.08)' : 'rgba(210,153,34,0.06)',
        border: `1px solid ${success ? 'rgba(63,185,80,0.4)' : 'rgba(210,153,34,0.4)'}`,
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 24,
        fontSize: 17,
        lineHeight: 1.6,
        color: PALETTE.text
      }}>
        {success ? successMessages[choices.goal] : (
          <span>
            Your decisions did not produce a construct capable of meeting the project goal:{' '}
            <em style={{ color: PALETTE.text }}>{goal.subtitle}</em>. Review the table below to see
            where each choice helped or hurt, and try again with a different strategy.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={STYLES.metricBadge}>
          <div style={STYLES.metricLabel}>Total time</div>
          <div style={STYLES.metricValue}>{time} d</div>
        </div>
        <div style={STYLES.metricBadge}>
          <div style={STYLES.metricLabel}>Total cost</div>
          <div style={STYLES.metricValue}>${cost}</div>
        </div>
        <div style={STYLES.metricBadge}>
          <div style={STYLES.metricLabel}>Project</div>
          <div style={{ ...STYLES.metricValue, fontSize: 16 }}>{goal.title}</div>
        </div>
      </div>

      {/* Constructed plasmid map */}
      {choices.vector && (() => {
        const constructFeatures = buildConstructFeatures(choices);
        const vmap = VECTOR_MAPS[choices.vector];
        if (!constructFeatures || !vmap) return null;

        const insertObtained = computeInsertObtained(choices);
        const ligationOk = computeLigationSuccess(choices);
        const introns = computeInsertHasIntrons(choices);
        const orientationOk = computeOrientationCorrect(choices);

        let captionParts = [];
        if (!insertObtained) {
          captionParts.push('No usable insert was generated upstream of cloning, so the vector closed back on itself.');
        } else if (!ligationOk) {
          captionParts.push('Insert and vector ends were not compatible, so no insert was successfully ligated into the vector.');
        } else {
          if (introns) captionParts.push('The insert is shown in red because it carries unexpected sequence (introns) that will disrupt the open reading frame.');
          if (orientationOk === false) captionParts.push('Note that the insert arrow points anticlockwise — the insert is in the reverse orientation relative to the vector promoter.');
          if (introns === false && orientationOk === true) captionParts.push('The insert is correctly placed and oriented within the vector.');
        }

        return (
          <div style={{
            background: PALETTE.bgPanelAlt,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: '20px 24px 24px',
            marginBottom: 26
          }}>
            <h3 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 600,
              color: PALETTE.text,
              margin: '0 0 6px'
            }}>The construct you built</h3>
            <p style={{
              fontSize: 14,
              color: PALETTE.textDim,
              margin: '0 0 16px',
              lineHeight: 1.55
            }}>
              {captionParts.join(' ') || 'Your final construct.'}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0'
            }}>
              <PlasmidMap
                title={`${vmap.name} construct`}
                sizeBp={vmap.sizeBp}
                features={constructFeatures}
                size={360}
                centreLabel={vmap.name}
                centreSubLabel="construct"
              />
            </div>
          </div>
        );
      })()}

      <h3 style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 22,
        fontWeight: 600,
        color: PALETTE.text,
        margin: '0 0 14px'
      }}>Decision-by-decision breakdown</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {debriefRows.map(row => {
          const sc = STATUS_COLORS[row.status];
          return (
            <div key={row.decision.id} style={{
              background: PALETTE.bgPanelAlt,
              border: `1px solid ${PALETTE.border}`,
              borderLeft: `3px solid ${sc.color}`,
              borderRadius: 8,
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) auto',
              gap: 14,
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: PALETTE.textMuted,
                  fontFamily: FONT_MONO,
                  marginBottom: 4
                }}>
                  Step {row.decision.stepNumber} · {row.decision.shortLabel}
                </div>
                <div style={{ fontSize: 17, color: PALETTE.text, marginBottom: 6, fontWeight: 500 }}>
                  {row.choiceLabel}
                </div>
                <div style={{ fontSize: 15, color: PALETTE.textDim, lineHeight: 1.55 }}>
                  {row.note}
                </div>
              </div>
              <div style={{
                fontSize: 12,
                fontFamily: FONT_MONO,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: sc.color,
                background: sc.bg,
                padding: '4px 10px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}>
                {sc.label}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onRestart} style={STYLES.primaryButton}>
        Restart and try a different strategy
      </button>
    </div>
  );
}

/* ============================================================================
   Main component
   ========================================================================= */

const FLOW = [
  'intro',
  'd_source',
  'd_template',
  'd_primers',
  'd_vector',
  'd_re',
  'plate',
  'd_validation',
  'validation',
  'end'
];

export default function CloningSimulation() {
  const [stage, setStage] = useState('intro');
  const [choices, setChoices] = useState({});
  const [time, setTime] = useState(0);
  const [cost, setCost] = useState(0);

  function selectGoal(goalId) {
    setChoices({ goal: goalId });
    setStage('d_source');
  }

  function makeChoice(decisionId, opt) {
    setChoices(c => ({ ...c, [decisionId]: opt.value }));
    setTime(t => t + opt.time);
    setCost(c => c + opt.cost);
    setStage(nextStageAfterDecision(decisionId));
  }

  function restart() {
    setChoices({});
    setTime(0);
    setCost(0);
    setStage('intro');
  }

  function nextStageAfterDecision(decisionId) {
    const map = {
      source: 'd_template',
      template: 'd_primers',
      primers: 'd_vector',
      vector: 'd_re',
      re: 'plate',
      validation: 'validation'
    };
    return map[decisionId];
  }

  // Step number for the progress bar (0 = intro, 1..6 = decisions, 7 = post-flow)
  let currentStep = 0;
  if (stage === 'd_source') currentStep = 1;
  else if (stage === 'd_template') currentStep = 2;
  else if (stage === 'd_primers') currentStep = 3;
  else if (stage === 'd_vector') currentStep = 4;
  else if (stage === 'd_re') currentStep = 5;
  else if (stage === 'plate') currentStep = 5.5;
  else if (stage === 'd_validation') currentStep = 6;
  else if (stage === 'validation') currentStep = 6.5;
  else if (stage === 'end') currentStep = 7;

  const decisionMap = useMemo(() => Object.fromEntries(DECISIONS.map(d => [d.id, d])), []);

  let body = null;
  if (stage === 'intro') {
    body = <IntroScreen onSelectGoal={selectGoal} />;
  } else if (stage === 'd_source') {
    body = <DecisionScreen decision={decisionMap.source}
                            onChoose={opt => makeChoice('source', opt)} />;
  } else if (stage === 'd_template') {
    body = <DecisionScreen decision={decisionMap.template}
                            onChoose={opt => makeChoice('template', opt)} />;
  } else if (stage === 'd_primers') {
    body = <DecisionScreen decision={decisionMap.primers}
                            onChoose={opt => makeChoice('primers', opt)} />;
  } else if (stage === 'd_vector') {
    body = <VectorSelectionScreen decision={decisionMap.vector}
                                   onChoose={opt => makeChoice('vector', opt)} />;
  } else if (stage === 'd_re') {
    body = <DecisionScreen decision={decisionMap.re}
                            onChoose={opt => makeChoice('re', opt)} />;
  } else if (stage === 'plate') {
    body = <PlateResultScreen choices={choices} onContinue={() => setStage('d_validation')} />;
  } else if (stage === 'd_validation') {
    body = <DecisionScreen decision={decisionMap.validation}
                            onChoose={opt => makeChoice('validation', opt)} />;
  } else if (stage === 'validation') {
    body = <ValidationResultScreen choices={choices} onContinue={() => setStage('end')} />;
  } else if (stage === 'end') {
    body = <EndScreen choices={choices} time={time} cost={cost} onRestart={restart} />;
  }

  const showProgress = stage !== 'intro';

  return (
    <div style={STYLES.app}>
      <div style={STYLES.shell}>
        <TopBar time={time} cost={cost} goal={choices.goal} />
        {showProgress && <ProgressBar currentStep={Math.floor(currentStep)} choices={choices} />}
        {body}
      </div>
    </div>
  );
}
