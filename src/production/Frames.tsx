import { useId } from "react"

export function Finn({
  x,
  y,
  scale = 1,
  pose = "point",
  pixel = false,
  clay = false,
  uid = "finn",
  time,
}: {
  x: number
  y: number
  scale?: number
  pose?: string
  pixel?: boolean
  clay?: boolean
  uid?: string
  time?: number
}) {
  const skin = clay ? `url(#${uid}-skin)` : "#f7cda5"
  const animated = time !== undefined
  const t = time ?? 0
  const blinkPhase = (t + Math.sin(t * 0.21) * 0.7) % 4.3
  const eyeHeight = animated && blinkPhase > 4.12 ? 0.4 : 2.8
  const gaze = animated ? Math.sin(t * 0.63) * 1.6 : 0
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="#152323"
      strokeWidth={pixel ? 0 : 1.7}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {pixel ? (
        <>
          <path d="M4 62H18V49H76V62H88V128H4Z" fill="#4c9b38" />
          <path d="M14 90H75V140H14Z" fill="#029fcb" />
          <path d="M14 140H75V164H51V150H39V164H14Z" fill="#146ab1" />
          <path d="M21 164H33V192H21ZM57 164H69V192H57Z" fill="#f7cda5" />
          <path
            d="M16 192H35V202H12V196H16ZM55 192H75V202H55Z"
            fill="#15191c"
          />
          <path d="M6 22V8H18V15H72V8H84V75H6Z" fill="#fff" />
          <path d="M18 28H72V66H18Z" fill="#f7cda5" />
          <path
            d="M29 40H33V45H29ZM56 40H60V45H56ZM38 55H53V59H38Z"
            fill="#15191c"
          />
          <path
            d={pose === "point" ? "M75 95H111V104H75Z" : "M75 95H84V140H75Z"}
            fill="#f7cda5"
          />
          <path d="M5 95H14V140H5Z" fill="#f7cda5" />
        </>
      ) : (
        <>
          <ellipse
            cx="47"
            cy="203"
            rx="45"
            ry="8"
            fill="#001d2920"
            stroke="none"
          />
          <path
            d="M11 75Q-6 73-6 106V130Q1 146 22 140L79 136Q98 110 81 79Z"
            fill="#4e9e35"
          />
          <path d="M5 83Q16 63 45 74L76 79 81 104 4 104Z" fill="#9dd66e" />
          <path
            d="M21 151 20 189M65 151 67 189"
            stroke={skin}
            strokeWidth="10"
          />
          <path
            d="M15 188Q20 183 27 188L30 198Q19 205 7 199Q7 193 15 188ZM61 188Q68 183 74 189L83 196Q83 205 59 200Z"
            fill="#111"
          />
          <path
            d="M15 186Q21 191 27 186M60 186Q67 191 73 186"
            stroke="white"
            strokeWidth="5"
          />
          <path d="M11 130H78V158H52V146H39V158H14Z" fill="#1269af" />
          <path
            d="M11 80Q45 69 77 80L81 132Q49 141 10 131Z"
            fill={clay ? `url(#${uid}-shirt)` : "#009dce"}
          />
          <path
            d="M10 83Q0 99 6 124"
            fill="none"
            stroke="#9dd66e"
            strokeWidth="10"
          />
          <path
            d="M78 83Q84 99 80 120"
            fill="none"
            stroke="#9dd66e"
            strokeWidth="8"
          />
          <path
            d="M6 102Q1 129 7 149Q12 155 13 147"
            fill="none"
            stroke={skin}
            strokeWidth="9"
          />
          <g
            transform={`rotate(${
              animated ? Math.sin(t * 2.4) * (pose === "wave" ? 9 : 4) : 0
            } 82 101)`}
          >
            {pose === "point" ? (
              <path
                d="M82 101Q102 102 117 95L130 92M120 95 123 100"
                fill="none"
                stroke={skin}
                strokeWidth="9"
              />
            ) : pose === "think" ? (
              <path
                d="M81 102Q77 126 57 103L57 78"
                fill="none"
                stroke={skin}
                strokeWidth="9"
              />
            ) : pose === "wave" ? (
              <path
                d="M82 101Q100 93 104 60L99 47M104 60 110 48"
                fill="none"
                stroke={skin}
                strokeWidth="9"
              />
            ) : (
              <path
                d="M82 101Q91 123 84 149"
                fill="none"
                stroke={skin}
                strokeWidth="9"
              />
            )}
          </g>
          <g
            transform={`rotate(${
              animated ? Math.sin(t * 1.7 - 0.3) * 2 : 0
            } 45 78)`}
          >
            <path
              d="M3 26Q0 3 9 3Q16 3 17 18Q42 9 71 18Q73 2 81 4Q88 6 85 29L87 80Q45 92 2 80Z"
              fill={clay ? `url(#${uid}-white)` : "#fff"}
            />
            <ellipse cx="45" cy="50" rx="33" ry="25" fill={skin} />
            <ellipse
              cx={32 + gaze}
              cy="47"
              rx="1.8"
              ry={eyeHeight}
              fill="#111"
              stroke="none"
            />
            <ellipse
              cx={57 + gaze}
              cy="47"
              rx="1.8"
              ry={eyeHeight}
              fill="#111"
              stroke="none"
            />
            {pose === "think" ? (
              <path d="M40 62Q47 57 53 62" fill="none" />
            ) : (
              <path d="M37 60Q46 67 54 59" fill="none" />
            )}
          </g>
        </>
      )}
    </g>
  )
}

export default function DirectionFrame({
  styleId,
  shot = 0,
  safe = false,
}: {
  styleId: string
  shot?: number
  safe?: boolean
}) {
  const uid = useId().replace(/:/g, "")
  const pixel = styleId === "pixel",
    clay = styleId === "clay",
    hybrid = styleId === "hybrid"
  const dark = pixel || hybrid
  const bg = pixel
    ? "#141a38"
    : clay
      ? "#eadad0"
      : hybrid
        ? "#111d2f"
        : "#f2eddf"
  const ink = dark ? "#f1f4ff" : "#1c3337"
  const accent = pixel
    ? "#a897ff"
    : clay
      ? "#ee966f"
      : hybrid
        ? "#81e2da"
        : "#de6b47"
  const title = ["ESCRIBES UNA FRASE.", "TODO SON TOKENS.", "TODO CONECTA."][
    shot
  ]
  return (
    <svg
      viewBox="0 0 270 480"
      className={`p-frame p-frame-${styleId}`}
      role="img"
      aria-label={`${styleId}, frame ${shot + 1}: ${title}`}
      shapeRendering={pixel ? "crispEdges" : undefined}
    >
      <defs>
        <radialGradient id={`${uid}-room`} cx=".5" cy=".3">
          <stop stopColor={clay ? "#fff6ec" : "#2f5261"} />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
        <linearGradient id={`${uid}-white`} x2="1" y2="1">
          <stop stopColor="#fff" />
          <stop offset=".6" stopColor="#e8eee8" />
          <stop offset="1" stopColor="#b4c3bc" />
        </linearGradient>
        <linearGradient id={`${uid}-shirt`} x2="1" y2="1">
          <stop stopColor="#5bd0f2" />
          <stop offset=".6" stopColor="#009dce" />
          <stop offset="1" stopColor="#0873a1" />
        </linearGradient>
        <radialGradient id={`${uid}-skin`} cx=".35" cy=".25">
          <stop stopColor="#ffe5c5" />
          <stop offset="1" stopColor="#e9b083" />
        </radialGradient>
        <pattern
          id={`${uid}-dots`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <circle r=".55" cx="2" cy="2" fill={ink} opacity=".1" />
        </pattern>
        <pattern
          id={`${uid}-grid`}
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M22 0H0V22"
            fill="none"
            stroke={accent}
            strokeOpacity=".12"
            strokeWidth=".7"
          />
        </pattern>
      </defs>
      <rect
        width="270"
        height="480"
        fill={dark || clay ? `url(#${uid}-room)` : bg}
      />
      {dark ? (
        <>
          <rect width="270" height="480" fill={`url(#${uid}-grid)`} />
          <circle cx="240" cy="185" r="140" fill={accent} opacity=".06" />
        </>
      ) : (
        <>
          <circle
            cx="260"
            cy="160"
            r="170"
            fill={clay ? "#e9c5aa" : "#e1e6b6"}
            opacity=".6"
          />
          {!clay && (
            <rect width="270" height="480" fill={`url(#${uid}-dots)`} />
          )}
        </>
      )}
      <text
        x="20"
        y="31"
        fill={ink}
        opacity=".6"
        fontSize="6.5"
        fontFamily="monospace"
        letterSpacing="2"
      >
        FINN LAB / IA POR DENTRO
      </text>
      <text
        x="20"
        y="65"
        fill={ink}
        fontSize={shot === 1 ? 24 : 23}
        fontWeight="900"
        fontFamily={pixel ? "monospace" : "Manrope Variable, sans-serif"}
        letterSpacing="-1.2"
      >
        {title.split(" ").slice(0, 2).join(" ")}
      </text>
      <text
        x="20"
        y="94"
        fill={shot === 1 ? accent : ink}
        fontSize="27"
        fontWeight="900"
        fontFamily={pixel ? "monospace" : "Manrope Variable, sans-serif"}
        letterSpacing="-1.3"
      >
        {title.split(" ").slice(2).join(" ")}
      </text>
      {shot === 0 && (
        <>
          <g
            transform={
              hybrid
                ? "translate(18 -5) skewY(-6)"
                : clay
                  ? "translate(9 0) rotate(-4 140 200)"
                  : "rotate(-4 135 200)"
            }
          >
            {clay && (
              <rect
                x="55"
                y="148"
                width="184"
                height="137"
                rx="17"
                fill="#b7aaa1"
              />
            )}
            <rect
              x="46"
              y="138"
              width="182"
              height="136"
              rx={pixel ? 0 : 13}
              fill={dark ? "#27375a" : "#243c42"}
              stroke={accent}
              strokeWidth={pixel ? 3 : 2}
            />
            <rect
              x="55"
              y="149"
              width="164"
              height="107"
              rx={pixel ? 0 : 6}
              fill={dark ? "#131c34" : "#d3e9d7"}
            />
            <circle cx="67" cy="160" r="2" fill={accent} />
            <path d="M74 160H99" stroke={accent} strokeWidth="2" />
            <text
              x="69"
              y="190"
              fontSize="11"
              fontWeight="700"
              fill={dark ? "#e9e4ff" : "#28433c"}
            >
              ¿Por qué el cielo
            </text>
            <text
              x="69"
              y="207"
              fontSize="11"
              fontWeight="700"
              fill={dark ? "#e9e4ff" : "#28433c"}
            >
              es azul?
            </text>
            <rect
              x="67"
              y="226"
              width="54"
              height="15"
              rx={pixel ? 0 : 7}
              fill={accent}
            />
            <text x="77" y="236" fontSize="6.5" fill="#1b2634" fontWeight="800">
              ENTER ↵
            </text>
            <path
              d="M128 274v18h-30M169 274v18h30"
              fill="none"
              stroke={dark ? accent : "#243c42"}
              strokeWidth="6"
            />
          </g>
          <path
            d="M0 365 270 310V413L0 449Z"
            fill={dark ? "#23324e" : "#b9c5b2"}
          />
          <g transform="translate(135 328) rotate(-13)">
            <rect
              width="107"
              height="43"
              rx={pixel ? 0 : 7}
              fill={dark ? "#4a527c" : "#fdf8ef"}
              stroke={ink}
              strokeWidth="1.5"
            />
            {Array.from({ length: 24 }, (_, i) => (
              <rect
                key={i}
                x={8 + (i % 8) * 12}
                y={7 + Math.floor(i / 8) * 10}
                width="8"
                height="5"
                rx={pixel ? 0 : 1}
                fill={dark ? "#a89ed8" : "#8d9f94"}
              />
            ))}
          </g>
          <Finn
            uid={uid}
            x={26}
            y={251}
            scale={0.7}
            pose="point"
            pixel={pixel}
            clay={clay}
          />
          {!dark && !clay && (
            <path
              d="m228 119 12-12m-8 23 18-3m-26-19 3-16"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </>
      )}
      {shot === 1 && (
        <>
          <g transform="rotate(-10 135 210)">
            {["¿", "Por", "qué", "el", "cie", "lo", "es", "azul", "?"].map(
              (word, i) => {
                const x = 28 + (i % 3) * 77,
                  y = 148 + Math.floor(i / 3) * 56
                return (
                  <g
                    key={i}
                    transform={`translate(${x} ${y}) rotate(${i % 2 ? 7 : -3})`}
                  >
                    {clay && (
                      <rect
                        x="3"
                        y="5"
                        width="64"
                        height="39"
                        rx="9"
                        fill="#ae958a"
                      />
                    )}
                    <rect
                      width="64"
                      height="39"
                      rx={pixel ? 0 : 9}
                      fill={
                        i === 4 || i === 5
                          ? accent
                          : dark
                            ? "#29385a"
                            : "#faf9f2"
                      }
                      stroke={dark ? accent : "#29413f"}
                      strokeWidth="1.4"
                    />
                    <text
                      x="32"
                      y="25"
                      fontSize="15"
                      fontWeight="800"
                      textAnchor="middle"
                      fill={i === 4 || i === 5 ? "#1a2a30" : ink}
                    >
                      {word}
                    </text>
                  </g>
                )
              },
            )}
          </g>
          <path
            d="M211 250 92 326"
            stroke={dark ? "#dbbaff" : "#ed744c"}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M216 245 96 321" stroke="#fff9e7" strokeWidth="2" />
          <Finn
            uid={uid}
            x={36}
            y={300}
            scale={0.56}
            pose="point"
            pixel={pixel}
            clay={clay}
          />
          <text x="120" y="353" fontSize="10" fill={ink} fontWeight="800">
            token ≠ palabra
          </text>
          <text x="120" y="367" fontSize="6" fill={ink} opacity=".6">
            segmentación ilustrativa
          </text>
        </>
      )}
      {shot === 2 && (
        <>
          {hybrid &&
            [0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={`M20 ${175 + i * 20} 139 ${125 + i * 20} 249 ${175 + i * 20} 132 ${230 + i * 20}Z`}
                stroke={accent}
                fill="#142935"
                fillOpacity=".5"
                strokeOpacity=".35"
              />
            ))}
          {[
            [44, 172, 128, 209],
            [128, 209, 225, 158],
            [128, 209, 204, 277],
            [44, 172, 57, 279],
            [57, 279, 204, 277],
          ].map(([x, y, tx, ty], i) => (
            <path
              key={i}
              d={`M${x} ${y}Q${(x + tx) / 2 + 17} ${(y + ty) / 2 - 15} ${tx} ${ty}`}
              stroke={accent}
              strokeWidth={i === 2 ? 6 : 1.5}
              fill="none"
              opacity={i === 2 ? 1 : 0.55}
            />
          ))}
          {[
            [44, 172, "por"],
            [128, 209, "cielo"],
            [225, 158, "qué"],
            [57, 279, "es"],
            [204, 277, "azul"],
          ].map(([x, y, label], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect
                x="-26"
                y="-14"
                width="52"
                height="28"
                rx={pixel ? 0 : 8}
                fill={
                  i === 1 || i === 4 ? accent : dark ? "#263c50" : "#fffcf1"
                }
                stroke={dark ? accent : ink}
                strokeWidth="1"
              />
              <text
                textAnchor="middle"
                y="4"
                fontSize="10"
                fontWeight="800"
                fill={i === 1 || i === 4 ? "#173337" : ink}
              >
                {label}
              </text>
            </g>
          ))}
          <Finn
            uid={uid}
            x={72}
            y={310}
            scale={0.52}
            pose="think"
            pixel={pixel}
            clay={clay}
          />
          <g transform="translate(180 342) rotate(20)">
            <circle
              r="21"
              stroke={dark ? "#f2dfbf" : "#3c5556"}
              strokeWidth="5"
              fill={accent}
              fillOpacity=".16"
            />
            <path
              d="M15 15 37 37"
              stroke={ink}
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
          <text
            x="135"
            y="132"
            textAnchor="middle"
            fontSize="6"
            letterSpacing="2"
            fill={accent}
          >
            ATENCIÓN / CONEXIONES
          </text>
        </>
      )}
      <rect
        x="19"
        y="418"
        width="232"
        height="39"
        rx={pixel ? 0 : 8}
        fill={dark ? "#080e1ddb" : "#fffdf3ed"}
        stroke={dark ? "#ffffff20" : "#243c4225"}
      />
      <text
        x="135"
        y="442"
        textAnchor="middle"
        fontSize="12"
        fontWeight="900"
        fill={dark ? "#fff" : "#183332"}
      >
        {
          [
            "Y PASA ESTO.",
            "TROCITOS CON SIGNIFICADO.",
            "ASÍ CAPTA EL CONTEXTO.",
          ][shot]
        }
      </text>
      <text
        x="20"
        y="471"
        fontSize="5.5"
        fill={ink}
        opacity=".55"
        letterSpacing="1.2"
      >
        ESTUDIO VISUAL · NO ES RENDER FINAL
      </text>
      {safe && (
        <g pointerEvents="none">
          <rect
            x="16"
            y="55"
            width="218"
            height="337"
            rx="5"
            fill="none"
            stroke="#dd615c"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x="21" y="387" fill="#dd615c" fontSize="6">
            ZONA SEGURA ORIENTATIVA
          </text>
        </g>
      )}
    </svg>
  )
}
