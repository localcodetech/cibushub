import AdinkraSymbol from "./AdinkraSymbol";

// A gold badge with an Adinkra symbol, for recognition that was earned:
//   <SymbolBadge symbol="adinkrahene" label="Top rated" explain="Adinkrahene: the chief of Adinkra symbols, for greatness" />
// Gold with Cocoa text and symbol (design guide: gold is never text on cream).
// explain: the symbol's meaning in plain words; screen readers hear it, and it shows on hover.
const SymbolBadge = ({ symbol, label, explain }) => {
  return (
    <span
      title={explain}
      className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-gold px-2 py-0.5 text-[13px] font-bold text-gold-foreground"
    >
      <AdinkraSymbol symbol={symbol} size={14} />
      {label}
      <span className="sr-only">: {explain}</span>
    </span>
  );
};

export default SymbolBadge;
