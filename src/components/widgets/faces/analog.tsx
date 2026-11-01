import { Bar, C, Cap, Dots, NumeralRing, Seconds, Shape, Svg, Ticks, Turn, Txt, hourAngle, minuteAngle, polar, type FaceProps } from "./parts";

const ALL_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function Classic({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={50} r={50} fill={C.container} />
      <Dots radius={42} size={2} color={C.onContainer} opacity={0.45} />
      {date && <Txt y={69} size={7} color={C.onContainer}>{`${time.weekday} ${time.day}`}</Txt>}
      <Turn angle={hourAngle(time)}>
        <Bar length={22} width={7} color={C.onContainer} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={35} width={4.5} color={C.accent} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={38} width={1.5} tail={9} color={C.pop} />
        </Seconds>
      )}
      <Cap r={3} color={seconds ? C.pop : C.accent} inner={C.container} />
    </Svg>
  );
}

export function Cookie({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <Shape id="cookie12" fill={C.container} />
      {date && (
        <Txt y={71} size={8} weight={700} color={C.onContainer}>
          {time.day}
        </Txt>
      )}
      <Turn angle={hourAngle(time)}>
        <Bar length={19} width={9} color={C.onContainer} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={32} width={6} color={C.accent} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={12} r={3.2} fill={C.pop} />
        </Seconds>
      )}
    </Svg>
  );
}

export function Sunny({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <Shape id="sunny" fill={C.accent} />
      <Turn angle={hourAngle(time)}>
        <Bar length={19} width={7} color={C.onAccent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={30} width={4.5} color={C.onAccent} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={33} width={1.4} tail={7} color={C.onAccent} opacity={0.7} />
        </Seconds>
      )}
      <Cap r={3.6} color={C.onAccent} inner={C.accent} />
    </Svg>
  );
}

export function Clover({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <Shape id="clover4" fill={C.container} />
      <Dots count={4} radius={40} size={2.6} color={C.accent} />
      <Turn angle={hourAngle(time)}>
        <Bar length={17} width={8} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={28} width={5} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={26} r={2.3} fill={C.pop} />
        </Seconds>
      )}
    </Svg>
  );
}

export function Flower({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <Shape id="flower8" fill={C.container} />
      <Dots count={8} radius={37} size={1.8} color={C.onContainer} opacity={0.5} />
      {date && <Txt y={30} size={6.5} weight={700} color={C.onContainer}>{`${time.weekday} ${time.day}`}</Txt>}
      <Turn angle={hourAngle(time)}>
        <Bar length={19} width={7} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={31} width={4.5} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={34} width={1.4} tail={7} color={C.pop} />
        </Seconds>
      )}
      <Cap r={2.8} color={seconds ? C.pop : C.accent} inner={C.container} />
    </Svg>
  );
}

export function Burst({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <Shape id="burst" fill={C.pop} />
      <Turn angle={hourAngle(time)}>
        <Bar length={19} width={7.5} color={C.onPop} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={30} width={5} color={C.onPop} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={16} r={2.4} fill={C.onPop} />
        </Seconds>
      )}
      <Cap r={3.4} color={C.onPop} />
    </Svg>
  );
}

export function Squircle({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <Shape id="squircle" fill={C.container} />
      <NumeralRing time={time} values={[12, 3, 6, 9]} radius={40} size={12} weight={700} color={C.onContainer} />
      {date && (
        <g>
          <rect x={39} y={61} width={22} height={11} rx={5.5} fill={C.accent} />
          <Txt y={66.5} size={6.5} weight={700} color={C.onAccent}>
            {time.day}
          </Txt>
        </g>
      )}
      <Turn angle={hourAngle(time)}>
        <Bar length={20} width={6.5} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={31} width={4} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={34} width={1.4} tail={7} color={C.pop} />
        </Seconds>
      )}
      <Cap r={3} color={seconds ? C.pop : C.accent} inner={C.container} />
    </Svg>
  );
}

export function Numerals({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={50} r={50} fill={C.container} />
      <NumeralRing time={time} values={ALL_HOURS} radius={39} size={8.5} color={C.onContainer} />
      <Turn angle={hourAngle(time)}>
        <Bar length={19} width={6.5} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={29} width={4} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={33} width={1.3} tail={7} color={C.pop} />
        </Seconds>
      )}
      <Cap r={2.8} color={seconds ? C.pop : C.accent} inner={C.container} />
    </Svg>
  );
}

export function Chrono({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={50} r={50} fill={C.container} />
      <Ticks radius={46} minor={{ length: 3, width: 0.9 }} major={{ length: 7, width: 2.2 }} minorOpacity={0.45} color={C.onContainer} />
      {date && (
        <g>
          <rect x={66} y={44.5} width={16} height={11} rx={3} fill={C.accent} />
          <Txt x={74} y={50} size={6.5} weight={700} color={C.onAccent}>
            {time.day}
          </Txt>
        </g>
      )}
      <Turn angle={hourAngle(time)}>
        <Bar length={22} width={3.6} color={C.onContainer} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={36} width={2.6} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <Bar length={40} width={1} tail={11} color={C.pop} />
          <circle cx={50} cy={61} r={2} fill={C.pop} />
        </Seconds>
      )}
      <Cap r={2.4} color={seconds ? C.pop : C.onContainer} inner={C.container} />
    </Svg>
  );
}

export function Minimal({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={6} r={3.4} fill={C.accent} />
      <Turn angle={hourAngle(time)}>
        <Bar length={24} width={8} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={38} width={5} color={C.fg} />
      </Turn>
      {seconds && (
        <>
          <Seconds time={time} sweep={sweep}>
            <Bar length={41} width={1.5} tail={9} color={C.pop} />
          </Seconds>
          <Cap r={2.6} color={C.pop} />
        </>
      )}
    </Svg>
  );
}

export function Orbit({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <g fill="none" stroke={C.track} strokeWidth={1.2}>
        {seconds && <circle cx={50} cy={50} r={45} />}
        <circle cx={50} cy={50} r={34} />
        <circle cx={50} cy={50} r={23} />
      </g>
      <Turn angle={hourAngle(time)}>
        <circle cx={50} cy={27} r={5.5} fill={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <circle cx={50} cy={16} r={4.2} fill={C.fg} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={5} r={2.6} fill={C.pop} />
        </Seconds>
      )}
      <Txt y={date ? 47 : 50} size={10.5} weight={700} color={C.fg}>{`${time.hour}:${time.minute}`}</Txt>
      {date && <Txt y={57} size={5.5} weight={500} color={C.muted}>{`${time.weekday} ${time.day}`}</Txt>}
    </Svg>
  );
}

function sector(angle: number, radius: number) {
  if (angle >= 359.95) return `M50 ${50 - radius}A${radius} ${radius} 0 1 1 49.99 ${50 - radius}Z`;
  const end = polar(radius, angle / 360);
  return `M50 50L50 ${50 - radius}A${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}Z`;
}

export function Pie({ time }: FaceProps) {
  const angle = minuteAngle(time);
  return (
    <Svg>
      <circle cx={50} cy={50} r={50} fill={C.container} />
      {angle > 0.1 && <path d={sector(angle, 46)} fill={C.accent} />}
      <circle cx={50} cy={50} r={21} fill={C.container} />
      <Txt y={time.h12 ? 48 : 50} size={19} weight={800} color={C.onContainer}>
        {time.hour}
      </Txt>
      {time.h12 && (
        <Txt y={62} size={5.5} color={C.onContainer}>
          {time.dayPeriod}
        </Txt>
      )}
    </Svg>
  );
}

const WAVE = { radius: 40, amplitude: 2.2, waves: 14, gap: 10 };

/** M3 Expressive wavy circular progress indicator. */
function wavyArc(progress: number) {
  const end = progress * 360;
  let path = "";
  for (let degree = 0; ; degree = Math.min(end, degree + 1.5)) {
    const radius = WAVE.radius + WAVE.amplitude * Math.sin((degree / 360) * WAVE.waves * Math.PI * 2);
    const point = polar(radius, degree / 360);
    path += `${path ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    if (degree >= end) break;
  }
  return path;
}

function trackArc(progress: number) {
  const start = progress * 360 + WAVE.gap;
  const end = 360 - WAVE.gap;
  if (end - start < 1) return "";
  const a = polar(WAVE.radius, start / 360);
  const b = polar(WAVE.radius, end / 360);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${WAVE.radius} ${WAVE.radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function Wavy({ time, seconds, date }: FaceProps) {
  const progress = seconds ? time.s / 60 : (time.m + time.s / 60) / 60;
  const track = trackArc(progress);
  return (
    <Svg>
      {track && <path d={track} fill="none" stroke={C.track} strokeWidth={4.4} strokeLinecap="round" />}
      {progress > 0 && <path d={wavyArc(progress)} fill="none" stroke={C.accent} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />}
      <Txt y={date ? 46 : 50} size={15} weight={700} color={C.fg}>{`${time.hour}:${time.minute}`}</Txt>
      {date ? (
        <Txt y={58.5} size={6} weight={500} color={C.muted}>
          {time.date}
        </Txt>
      ) : time.h12 ? (
        <Txt y={60} size={6} color={C.muted}>
          {time.dayPeriod}
        </Txt>
      ) : null}
    </Svg>
  );
}
