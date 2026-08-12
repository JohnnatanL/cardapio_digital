"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { PublicItem, Tag, Locale } from "@/types/database";
import { t } from "@/lib/i18n";
import { formatarPreco } from "@/lib/utils";
import { itemDisponivel, previsaoRetorno, precoComVariacao } from "@/lib/menu";
import { Leader } from "./Leader";
import { TagIcon } from "./TagIcon";

export function ItemCard({
  item, tagsPorId, locale, moeda, padrao, onVer,
}: {
  item: PublicItem;
  tagsPorId: Map<string, Tag>;
  locale: Locale;
  moeda: string;
  padrao: Locale;
  onVer?: (id: string) => void;
}) {
  const disponivel = itemDisponivel(item);
  const retorno = useMemo(() => previsaoRetorno(item, locale), [item, locale]);
  const { min, varia } = precoComVariacao(item);

  const descricao = t(item.description, locale, padrao);
  const nome = t(item.name, locale, padrao);

  return (
    <article
      className={`py-4 ${disponivel ? "" : "esgotado"}`}
      onClick={() => onVer?.(item.id)}
    >
      <div className="flex gap-3">
        {item.image_url && (
          <Image
            src={item.image_url}
            alt={t(item.image_alt, locale, padrao) || nome}
            width={64}
            height={64}
            className="h-16 w-16 flex-none rounded-[4px] object-cover"
            loading="lazy"
          />
        )}

        <div className="min-w-0 flex-1">
          {item.is_featured && (
            <p className="eyebrow tema-destaque mb-0.5">Destaque da casa</p>
          )}

          <Leader
            nome={nome}
            prefixo={varia ? "a partir de" : undefined}
            preco={formatarPreco(min, moeda, locale)}
          />

          {descricao && (
            <p className="mt-1 text-[0.75rem] leading-relaxed tema-suave">
              {descricao}
            </p>
          )}

          {/* Tags: ícone + tooltip. A legenda completa fica no bottom sheet. */}
          {item.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {item.tags.map((it) => {
                const tag = tagsPorId.get(it.tag_id);
                if (!tag) return null;
                const rotulo = t(tag.label, locale, padrao);
                return (
                  <li
                    key={it.tag_id}
                    className="flex items-center gap-1 text-[0.6875rem] tema-suave"
                    title={it.mode === "may_contain" ? `Pode conter ${rotulo}` : `Contém ${rotulo}`}
                  >
                    <TagIcon
                      nome={tag.icon}
                      className={`h-3.5 w-3.5 ${it.mode === "may_contain" ? "opacity-45" : ""}`}
                    />
                    <span className="sr-only">
                      {it.mode === "may_contain" ? "Pode conter" : "Contém"} {rotulo}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {!disponivel && (
            <p className="mt-1.5 text-[0.6875rem] font-medium" style={{ color: "var(--color-brasa)" }}>
              Esgotado{item.unavailable_reason ? ` — ${item.unavailable_reason}` : ""}
              {retorno ? ` · volta ${retorno}` : ""}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
