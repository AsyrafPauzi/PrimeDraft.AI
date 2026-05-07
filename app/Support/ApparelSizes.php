<?php

namespace App\Support;

final class ApparelSizes
{
    /** Canonical display / sort order */
    public const ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

    /** For factory pricing UI checklist */
    public static function canonicalCodes(): array
    {
        return self::ORDER;
    }

    public static function compare(string $a, string $b): int
    {
        $rank = array_flip(self::ORDER);
        $upperA = strtoupper($a);
        $upperB = strtoupper($b);
        $posA = $rank[$upperA] ?? PHP_INT_MAX;
        $posB = $rank[$upperB] ?? PHP_INT_MAX;
        if ($posA !== $posB) {
            return $posA <=> $posB;
        }

        return $upperA <=> $upperB;
    }

    /**
     * @param  iterable<int, array{size_code:string,price:mixed}|object>  $rows
     * @return array<int, array{code: string, price: float}>
     */
    public static function sortedPricedSizes(iterable $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $code = is_array($row) ? ($row['size_code'] ?? '') : ($row->size_code ?? '');
            $price = (float) (is_array($row) ? ($row['price'] ?? 0) : ($row->price ?? 0));
            if ($code === '' || $price <= 0) {
                continue;
            }
            $out[] = ['code' => $code, 'price' => $price];
        }
        usort($out, fn (array $x, array $y): int => self::compare($x['code'], $y['code']));

        return $out;
    }
}
