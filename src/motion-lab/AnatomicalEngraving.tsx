import { useId } from "react"

/** Original lateral cutaway illustration. Paths, sutures and hatching are authored
 * here at native vector resolution; no cropped reference pixels or stock icons. */
export default function AnatomicalEngraving() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const ink = "#4b4e45", shade = "#aaa89c", bone = "#d3d0c5"
  const vault = "M167 243C151 190 174 131 225 96C286 51 368 43 429 72C492 100 531 160 526 226C523 285 490 325 446 342L401 344L355 313L300 295L249 278L209 252Z"
  const gyri = [
    "M190 205q24-16 29-41t34-26q32 0 24-32", "M205 225q-8-23 17-30t20-27q-8-16 18-18t35-24q2-30 28-31",
    "M236 246q-17-19 9-30t21-32q-8-18 16-22t21-26q-2-17 22-23t22-32",
    "M268 258q-16-14-1-30t24-19q20-5 5-24t12-31q25-6 21-25t23-27",
    "M300 273q-19-16-4-34t32-18q25 0 12-21t14-35q23-7 12-26t15-26q21-2 19-28",
    "M330 286q-12-21 10-30t18-31q-4-19 18-21t11-27q-8-20 21-23t11-31",
    "M367 295q-14-16 5-29t34-11q24 1 14-21t11-27q23-5 11-28t12-28",
    "M401 311q-21-17-2-30t37-5q24 4 22-16t18-19q22 1 17-23t13-33",
    "M453 317q-12-19 9-28t26-7", "M186 179q-7-21 13-31t16-25", "M260 96q19 7 31-10t31-18",
    "M408 94q27-8 35 17t29 27q24 2 27 23", "M352 164q-22-12-22-28", "M323 222q-9 16 4 28",
    "M247 165q-22-8-23-23", "M381 229q17 6 10 20", "M435 181q27 5 28 25", "M467 233q-15-8-16-20",
  ]
  return <svg viewBox="105 35 445 435" width="100%" height="100%" role="img" aria-label="Grabado anatómico lateral original" data-original-vector="anatomical-engraving">
    <defs>
      <clipPath id={`${id}-vault`}><path d={vault} /></clipPath>
      <clipPath id={`${id}-jaw`}><path d="M164 292L211 292L305 322L394 326L420 348L393 389L322 436L244 450L182 429L158 383Z" /></clipPath>
      <pattern id={`${id}-hatch`} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(-34)">
        <path d="M0 0V7" stroke={ink} strokeWidth=".7" opacity=".38" />
      </pattern>
    </defs>
    <path d="M169 247C148 213 159 148 197 111C245 60 325 37 397 54C476 65 533 123 538 193C545 260 506 320 459 343L420 357L396 396C361 439 282 461 227 452C194 449 171 425 163 401L153 375L162 350L148 332L147 308L157 280Z" fill={bone} stroke={ink} strokeWidth={1.3} />
    <path d={vault} fill="#c3c0b2" stroke={ink} strokeWidth={1} />
    <g clipPath={`url(#${id}-vault)`}>
      <path d="M180 230C173 138 244 73 335 68C442 62 503 139 511 217C509 275 472 310 432 329L363 305L315 279L257 264Z" fill="#dfdbce" />
      <path d={vault} fill={`url(#${id}-hatch)`} />
      {gyri.map((d, i) => <g key={d}>
        <path d={d} fill="none" stroke="#77796f" strokeWidth={i % 3 === 0 ? 4 : 3} opacity=".24" strokeLinecap="round" />
        <path d={d} fill="none" stroke={ink} strokeWidth={.85} strokeLinecap="round" />
      </g>)}
      {Array.from({ length: 110 }, (_, i) => {
        const x = 185 + (i * 71 % 320), y = 80 + (i * 43 % 220)
        return <path key={`fold-${i}`} d={`M${x} ${y}q${4 + i % 7} ${-7 - i % 5} ${14 + i % 8} -4t${11 + i % 5} 7`} fill="none" stroke="#77796f" strokeWidth=".65" opacity=".48" />
      })}
      {Array.from({ length: 420 }, (_, i) => <circle key={`grain-${i}`} cx={166 + i * 73 % 365} cy={60 + i * 47 % 280} r={.3 + i % 4 * .12} fill="#454a3d" opacity=".18" />)}
      {Array.from({ length: 38 }, (_, i) => <path key={i} d={`M${165 + i * 10} ${75 + Math.sin(i * .77) * 12}q8 10 3 24`} fill="none" stroke="#6b6d64" opacity=".32" strokeWidth=".8" />)}
    </g>
    <path d="M181 226Q163 225 157 247L150 277L163 290L177 279L187 264L217 252L244 264L262 286L283 297L312 300L328 324L363 339L391 336L411 316L443 326L431 351L397 369L366 358L339 338L308 332L284 346L266 374L226 379L186 365L166 345L155 326L160 303L149 288L157 261Z" fill={bone} stroke={ink} strokeWidth={1.1} />
    <path d="M177 239C196 225 224 228 241 244L255 267C249 287 224 299 204 289L179 275C168 264 169 249 177 239Z" fill="#555b4f" stroke="#74766b" strokeWidth={2} />
    <path d="M184 245Q201 236 220 243M180 269Q199 288 220 284" stroke="#888c7c" strokeWidth={.8} fill="none" />
    <path d="M156 293L172 308L179 329L163 335L150 325L149 309Z" fill="#353934" stroke={ink} strokeWidth={1.5} />
    <path d="M161 283L170 296L177 317M181 298L200 306L206 324" fill="none" stroke="#77796d" strokeWidth={2} />
    <path d="M247 277C266 284 280 309 304 312L352 304L390 316L375 336L334 338L304 325L280 320L266 333L248 323L235 301Z" fill="#a8a89a" stroke={ink} strokeWidth={2} />
    <path d="M258 285Q279 323 306 321L354 316" fill="none" stroke="#eee9d9" strokeWidth={6} />
    <path d="M358 342Q351 367 373 380L395 365L408 338" fill={shade} stroke={ink} strokeWidth={2} />
    <path d="M172 371L180 401Q187 429 222 438Q295 457 357 411L387 379L377 355L364 366Q366 388 340 405Q283 438 225 418L204 386Z" fill={bone} stroke={ink} strokeWidth={1.3} />
    <path d="M181 392Q180 424 222 433Q298 449 350 409" fill="none" stroke="#7f8175" strokeWidth={2} />
    <path d="M218 406Q290 435 342 399" fill="none" stroke="#f0ebdd" strokeWidth={6} />
    <g clipPath={`url(#${id}-jaw)`}>
      {Array.from({ length: 39 }, (_, i) => <path key={i} d={`M${138 + i * 7} 315l-15 42M${245 + i * 6} 398l-10 34`} fill="none" stroke={ink} strokeWidth=".7" opacity=".38" />)}
    </g>
    <path d="M178 342Q212 351 247 353L270 351L265 381Q222 390 180 370Z" fill="#44493f" />
    {[10, 10, 11, 13, 15, 16, 18].map((width, i) => {
      const x = 179 + [0, 10, 20, 31, 44, 59, 75][i]
      const y = 340 + Math.sin(i / 6 * Math.PI) * 7
      return <g key={i}>
        <path d={`M${x} ${y}q${width * .5}-4 ${width} 1l-1 22q-${width / 2} 5-${width - 2} 0Z`} fill="#ebe5d4" stroke="#666b5e" strokeWidth={1.2} />
        <path d={`M${x + 1} ${y + 27}q${width * .5} 5 ${width - 2} 0l-2 14q-${width / 2} 4-${width - 5} 0Z`} fill="#d8d2be" stroke="#666b5e" strokeWidth={1.1} />
        <path d={`M${x + width * .5} ${y + 4}l-1 14`} fill="none" stroke="#929582" strokeWidth=".7" />
      </g>
    })}
    <path d="M272 348L293 327L319 331L330 353L315 372L286 383L274 371Z" fill="#a9aa9a" stroke="#575d50" strokeWidth={1.5} />
    <path d="M311 333L322 346L311 363M304 337L313 348L302 368M296 341L305 352L295 373" fill="none" stroke="#dcd7c7" strokeWidth={2} />
    <path d="M432 343L457 340L465 351L446 369L420 365" fill="#8b8e7f" stroke={ink} strokeWidth={2} />
    <path d="M452 343L455 362M438 346L440 364" stroke="#d6d1c1" strokeWidth={2} />
    <circle cx={212} cy={320} r={2.8} fill="#464d40" />
    <path d="M192 316l9 5M236 320l14 6M222 397l10 6M397 317l12-6M476 285l-12 10" stroke="#777c6d" strokeWidth={1.3} />
  </svg>
}
