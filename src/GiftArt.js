// Drawn pictures for each gift (used in the pop-up and the From Aryan list). No emoji.
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

const ROSE = '#C2456F', PINK = '#E06B8F', SOFT = '#F7C6D4', DEEP = '#7A1934', LEAF = '#4E9A5B';

const heart = (x, y, s, c, o = 1) => (
  <Path key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} fillOpacity={o}
    d="M0 -3 C0 -9 8 -9 8 -3 C8 2 0 6 0 8 C0 6 -8 2 -8 -3 C-8 -9 0 -9 0 -3 Z" fill={c} />
);
function Rose({ x, y, c = ROSE, r = 9 }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={c} />
      <Path d={`M${x - r * 0.5} ${y} Q${x} ${y - r * 0.7} ${x + r * 0.5} ${y} Q${x} ${y + r * 0.4} ${x - r * 0.5} ${y}`} stroke="#fff" strokeOpacity={0.55} strokeWidth={1.6} fill="none" />
      <Path d={`M${x - r * 0.75} ${y + r * 0.1} Q${x} ${y + r * 0.9} ${x + r * 0.75} ${y + r * 0.1}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.4} fill="none" />
    </G>
  );
}

function Art({ type }) {
  switch (type) {
    case 'flowers':
      return (
        <G>
          <Path d="M60 98 L50 60 M60 98 L60 56 M60 98 L71 60 M60 98 L42 66 M60 98 L79 66" stroke={LEAF} strokeWidth={3} />
          <Ellipse cx={40} cy={70} rx={9} ry={4} fill={LEAF} transform="rotate(-35 40 70)" />
          <Ellipse cx={82} cy={68} rx={9} ry={4} fill={LEAF} transform="rotate(35 82 68)" />
          <Rose x={44} y={58} /><Rose x={60} y={48} c={PINK} r={10} /><Rose x={76} y={58} /><Rose x={52} y={40} c="#E8577D" r={8} /><Rose x={69} y={40} c={DEEP} r={8} />
          <Path d="M38 72 L82 72 L68 112 L52 112 Z" fill={SOFT} stroke="#E8A2B8" strokeWidth={2} />
          <Path d="M50 88 Q60 96 70 88" stroke={ROSE} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M60 92 L52 102 M60 92 L68 102" stroke={ROSE} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'kisses':
      return (
        <G>
          {heart(60, 64, 4.2, ROSE)}
          <Path d="M44 66 Q52 58 60 64 Q68 58 76 66 Q68 76 60 72 Q52 76 44 66 Z" fill="#fff" fillOpacity={0.9} />
          <Path d="M47 66 Q60 70 73 66" stroke={DEEP} strokeWidth={1.6} fill="none" />
          {heart(98, 30, 1.2, PINK)}{heart(22, 40, 0.9, SOFT)}
        </G>
      );
    case 'cuddles':
      return (
        <G>
          {heart(48, 62, 3.2, PINK)}{heart(72, 62, 3.2, ROSE, 0.95)}
          <Path d="M30 70 Q60 108 90 70" stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.8} />
          {heart(100, 26, 1, SOFT)}{heart(20, 30, 1.1, PINK)}
        </G>
      );
    case 'chocolate':
      return (
        <G>
          <Rect x={30} y={30} width={60} height={74} rx={6} fill="#5A3220" />
          {[0, 1, 2].map(r => [0, 1].map(c => <Rect key={`${r}${c}`} x={36 + c * 26} y={36 + r * 16} width={22} height={12} rx={2} fill="#6E3E28" />))}
          <Rect x={30} y={78} width={60} height={30} rx={4} fill={ROSE} />
          {heart(60, 92, 1.3, '#fff')}
          <Path d="M30 78 L90 78" stroke={DEEP} strokeWidth={2} />
        </G>
      );
    case 'treat':
      return (
        <G>
          <Ellipse cx={60} cy={104} rx={44} ry={9} fill="#fff" stroke="#EBD9DF" strokeWidth={2} />
          <Path d="M24 98 L96 98 L92 62 L28 62 Z" fill="#F8D9A8" />
          <Path d="M26 76 L94 76" stroke="#F2A7C0" strokeWidth={7} />
          <Path d="M28 62 Q60 40 92 62 Z" fill="#FFF3F6" />
          <Path d="M34 62 q4 8 8 0 q4 8 8 0 q4 8 8 0 q4 8 8 0 q4 8 8 0 q4 8 8 0 q4 8 8 0" fill="#FFF3F6" />
          <Circle cx={60} cy={42} r={8} fill="#D7263D" />
          <Path d="M60 34 Q63 26 69 26" stroke={LEAF} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'thinking':
      return (
        <G>
          <Ellipse cx={64} cy={52} rx={40} ry={30} fill="#fff" stroke="#EBD9DF" strokeWidth={2} />
          <Circle cx={30} cy={90} r={7} fill="#fff" stroke="#EBD9DF" strokeWidth={2} />
          <Circle cx={18} cy={106} r={4} fill="#fff" stroke="#EBD9DF" strokeWidth={2} />
          {heart(64, 50, 2.4, ROSE)}
        </G>
      );
    default: // note
      return (
        <G>
          <Rect x={20} y={36} width={80} height={56} rx={6} fill="#FFF7EE" stroke="#E7CFC0" strokeWidth={2} />
          <Path d="M20 38 L60 70 L100 38" stroke="#E7CFC0" strokeWidth={2} fill="none" />
          <Circle cx={60} cy={70} r={11} fill={ROSE} />
          {heart(60, 69, 0.8, '#fff')}
        </G>
      );
  }
}

export default function GiftArt({ type, size = 120 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Art type={type} />
    </Svg>
  );
}
