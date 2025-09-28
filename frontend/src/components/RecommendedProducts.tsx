import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Product {
  id: string;
  brand: string;
  name: string;
  imageUrl: string;
  productUrl?: string | null;
  keyIngredients: string[];
  concernTags: string[];
  routineStep: string;
  fragranceFree?: boolean;
  nonComedogenic?: boolean;
  acneSafe?: boolean;
  alcoholFree?: boolean;
  rationale: string;
}

export interface Props {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

const routineLabel: Record<string, string> = {
  cleanser: "Cleanser",
  treatment: "Treatment",
  moisturizer: "Moisturizer",
  sunscreen: "Sunscreen",
  serum: "Serum",
  toner: "Toner",
};

export const RecommendedProducts: React.FC<Props> = ({ products, onProductClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((p) => (
        <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-3 p-3">
            <div className="w-20 h-20 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-semibold">
                  <span className="text-neutral-900">{p.brand}</span>{" "}
                  <span className="text-neutral-700">{p.name}</span>
                </div>
                <Badge variant="outline">{routineLabel[p.routineStep] || p.routineStep}</Badge>
              </div>
              <div className="mt-1 text-xs text-neutral-600 truncate">
                Key: {p.keyIngredients.slice(0, 3).join(", ")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.concernTags.slice(0, 4).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
                {p.acneSafe && (
                  <Badge variant="default" className="text-xs bg-emerald-600">
                    acne-safe
                  </Badge>
                )}
                {p.fragranceFree && (
                  <Badge variant="outline" className="text-xs">
                    fragrance-free
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-sm text-neutral-700 line-clamp-2">{p.rationale}</div>
              <div className="mt-3">
                <Button size="sm" onClick={() => onProductClick?.(p)}>
                  View
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
