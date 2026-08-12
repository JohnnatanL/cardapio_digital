/**
 * ASSINATURA DO PRODUTO — o líder pontilhado da comanda.
 *
 *   Baião de dois ....................... R$ 38,00
 *
 * Não é enfeite: alinha os preços numa coluna e deixa o olho descer a lista
 * comparando valores, que é exatamente o que a pessoa faz num cardápio.
 * Os numerais são tabulares, então todo preço ocupa a mesma largura.
 */
export function Leader({
  nome, preco, prefixo, className = "",
}: {
  nome: React.ReactNode;
  preco: string;
  prefixo?: string;
  className?: string;
}) {
  return (
    <div className={`leader ${className}`}>
      <span className="font-medium leading-snug">{nome}</span>
      <span className="leader-fill" aria-hidden />
      <span className="leader-price text-[0.9375rem]">
        {prefixo && <span className="tema-suave mr-1 text-[0.75rem]">{prefixo}</span>}
        {preco}
      </span>
    </div>
  );
}
