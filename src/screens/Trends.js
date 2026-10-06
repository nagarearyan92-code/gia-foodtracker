import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { C } from '../theme';
import { dateKey, loadDays, sumNutrients, useDay, useGoals, useWeights } from '../store';
import { Card, Chip, H, Muted, r0, r1 } from '../ui';

function lastNDays(n) {
  const out = [];
  const d = new Date(); d.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) out.push(new Date(d.getTime() - i * 864e5));
  return out;
}

function BarChart({ data, target, color, width, unit }) {
  const h = 160, padL = 34, padB = 22, padT = 10;
  const max = Math.max(target * 1.25, ...data.map(d => d.v), 1);
  const plotW = width - padL - 8, plotH = h - padB - padT;
  const bw = plotW / data.length;
  const y = v => padT + plotH - (v / max) * plotH;
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  return (
    <Svg width={width} height={h}>
      {ticks.map(t => (
        <React.Fragment key={t}>
          <Line x1={padL} x2={width - 8} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={1} />
          <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={C.muted} textAnchor="end">{t}</SvgText>
        </React.Fragment>
      ))}
      {data.map((d, i) => (
        <Rect key={i} x={padL + i * bw + bw * 0.18} width={bw * 0.64} y={y(d.v)} height={Math.max(0, padT + plotH - y(d.v))}
          rx={Math.min(4, bw * 0.2)} fill={d.v > 0 ? color : C.sunk} />
      ))}
      <Line x1={padL} x2={width - 8} y1={y(target)} y2={y(target)} stroke={C.ink} strokeDasharray="4 4" strokeWidth={1.2} />
      {data.map((d, i) => (data.length <= 7 || i % 5 === 0 || i === data.length - 1) ? (
        <SvgText key={'l' + i} x={padL + i * bw + bw / 2} y={h - 6} fontSize={10} fill={C.muted} textAnchor="middle">{d.label}</SvgText>
      ) : null)}
    </Svg>
  );
}

function WeightChart({ points, width }) {
  const h = 150, padL = 38, padB = 22, padT = 12;
  const vals = points.map(p => p.kg);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const plotW = width - padL - 12, plotH = h - padB - padT;
  const x = i => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = v => padT + plotH - ((v - min) / (max - min)) * plotH;
  const last = points[points.length - 1];
  return (
    <Svg width={width} height={h}>
      {[min, (min + max) / 2, max].map(t => (
        <React.Fragment key={t}>
          <Line x1={padL} x2={width - 12} y1={y(t)} y2={y(t)} stroke={C.line} />
          <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={C.muted} textAnchor="end">{r1(t)}</SvgText>
        </React.Fragment>
      ))}
      <Polyline points={points.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')} fill="none" stroke={C.accent} strokeWidth={2.5} />
      {points.map((p, i) => <Circle key={p.date} cx={x(i)} cy={y(p.kg)} r={i === points.length - 1 ? 5 : 3} fill={C.accent} />)}
      <SvgText x={padL} y={h - 6} fontSize={10} fill={C.muted}>{points[0].date.slice(5)}</SvgText>
      <SvgText x={width - 12} y={h - 6} fontSize={10} fill={C.muted} textAnchor="end">{last.date.slice(5)}</SvgText>
    </Svg>
  );
}

export default function Trends() {
  const [range, setRange] = useState(7);
  const [days, setDays] = useState(null);
  const goals = useGoals();
  const weights = useWeights() || [];
  const today = useDay(dateKey(new Date())); // re-render when today changes
  const { width } = useWindowDimensions();
  const chartW = width - 32 - 32;

  useEffect(() => {
    const ds = lastNDays(range);
    loadDays(ds.map(dateKey)).then(list => setDays(ds.map((d, i) => ({ d, t: sumNutrients(list[i].entries.map(e => e.n)), water: list[i].water || 0 }))));
  }, [range, today]);

  if (!days || !goals) return null;
  const logged = days.filter(x => (x.t.k || 0) > 0);
  const avg = k => (logged.length ? logged.reduce((a, x) => a + (x.t[k] || 0), 0) / logged.length : 0);
  const label = d => (range === 7 ? d.toLocaleDateString('en-GB', { weekday: 'narrow' }) : String(d.getDate()));
  const series = k => days.map(x => ({ v: x.t[k] || 0, label: label(x.d) }));
  const hitProtein = logged.filter(x => (x.t.p || 0) >= goals.p).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Last 7 days" active={range === 7} onPress={() => setRange(7)} />
        <Chip label="Last 30 days" active={range === 30} onPress={() => setRange(30)} />
      </View>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[['Avg kcal', r0(avg('k')), C.ink], ['Avg protein', r0(avg('p')) + ' g', C.protein], ['Avg fibre', r0(avg('fi')) + ' g', C.fibre]].map(([l, v, col]) => (
          <View key={l} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: col, fontVariant: ['tabular-nums'] }}>{v}</Text>
            <Muted>{l}</Muted>
          </View>
        ))}
      </Card>
      <Muted>
        {logged.length ? `Averages over the ${logged.length} day${logged.length === 1 ? '' : 's'} with food logged. Protein goal hit on ${hitProtein} of them.` : 'Log some food and your trends will show up here.'}
      </Muted>

      <Card><H style={{ marginBottom: 8 }}>Calories</H><BarChart data={series('k')} target={goals.k} color={C.accent} width={chartW} /><Muted>Dashed line: your {goals.k} kcal target</Muted></Card>
      <Card><H style={{ marginBottom: 8 }}>Protein (g)</H><BarChart data={series('p')} target={goals.p} color={C.protein} width={chartW} /><Muted>Dashed line: your {goals.p} g target</Muted></Card>
      <Card><H style={{ marginBottom: 8 }}>Fibre (g)</H><BarChart data={series('fi')} target={goals.fi} color={C.fibre} width={chartW} /><Muted>Dashed line: your {goals.fi} g target</Muted></Card>

      <Card>
        <H style={{ marginBottom: 8 }}>Weight</H>
        {weights.length ? <WeightChart points={weights.slice(-30)} width={chartW} /> : <Muted>Log your weight on the Me tab to see it here.</Muted>}
      </Card>
    </ScrollView>
  );
}
