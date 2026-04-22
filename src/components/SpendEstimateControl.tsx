import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getPricingQuote, PricingApiError } from '../api/pricing'
import { formatPreciseNumber } from '../lib/players'
import {
  buildPricingQuoteRequest,
  calculateSpendEstimate,
} from '../pricing/spendEstimate'
import type { ProjectionResourceUsage } from '../types'

interface SpendEstimateControlProps {
  damageTotal: number
  resourceUsage: ProjectionResourceUsage
}

function hasAnyUsage(resourceUsage: ProjectionResourceUsage) {
  return (
    resourceUsage.ammoUsed.lightAmmo > 0 ||
    resourceUsage.ammoUsed.ammo > 0 ||
    resourceUsage.ammoUsed.heavyAmmo > 0 ||
    resourceUsage.foodUsed.bread > 0 ||
    resourceUsage.foodUsed.steak > 0 ||
    resourceUsage.foodUsed.cookedFish > 0 ||
    resourceUsage.pillCount > 0 ||
    resourceUsage.equipmentUsed.length > 0
  )
}

function CoinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spend-estimate-coin"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        fill="none"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.4 10.1c0-1.3 1.2-2.3 2.7-2.3 1.4 0 2.5.7 2.5 1.9 0 1.1-.9 1.6-2.2 1.9l-.9.2c-1.5.3-2.5.9-2.5 2.1 0 1.3 1.2 2.2 2.9 2.2 1.7 0 3-.9 3.1-2.4M12 6.8v10.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function getPricingErrorMessage(error: unknown) {
  if (error instanceof PricingApiError && error.status === 404) {
    return 'Pricing API not available here. In plain npm run dev, use a deployed Vercel runtime for live pricing checks.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error.'
}

export function SpendEstimateControl({
  damageTotal,
  resourceUsage,
}: SpendEstimateControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pricingRequest = buildPricingQuoteRequest(resourceUsage)
  const shouldFetchPricing = isOpen && hasAnyUsage(resourceUsage)
  const pricingQuery = useQuery({
    enabled: shouldFetchPricing,
    gcTime: 30 * 60 * 1000,
    queryFn: () => getPricingQuote(pricingRequest),
    queryKey: ['pricing-quote', pricingRequest],
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  const spendEstimate = pricingQuery.data
    ? calculateSpendEstimate(resourceUsage, pricingQuery.data, damageTotal)
    : {
        ammoSpent: 0,
        costPer1kDamage: damageTotal > 0 ? 0 : null,
        equipmentSpent: 0,
        foodSpent: 0,
        isPartial: false,
        pillSpent: 0,
        totalSpent: 0,
        unpricedEquipmentCount: 0,
      }

  return (
    <div className="spend-estimate-shell">
      <button
        className="ghost-button spend-estimate-button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CoinIcon />
        <span>{isOpen ? 'Hide gold' : 'Estimate gold'}</span>
      </button>

      {isOpen ? (
        <div className="spend-estimate-panel">
          {pricingQuery.isPending ? (
            <span>Loading live prices...</span>
          ) : pricingQuery.isError ? (
            <span>
              Gold estimate failed: {getPricingErrorMessage(pricingQuery.error)}
            </span>
          ) : (
            <>
              <div className="spend-estimate-metric-grid">
                <div className="spend-estimate-metric">
                  <span>Estimated gold spent</span>
                  <strong>
                    {spendEstimate.isPartial ? '>=' : ''}
                    {formatPreciseNumber(spendEstimate.totalSpent)}
                  </strong>
                </div>

                <div className="spend-estimate-metric">
                  <span>Gold / 1k dmg</span>
                  <strong className="spend-estimate-metric-secondary">
                    {spendEstimate.costPer1kDamage === null
                      ? '--'
                      : `${spendEstimate.isPartial ? '>=' : ''}${formatPreciseNumber(spendEstimate.costPer1kDamage)}`}
                  </strong>
                </div>
              </div>
              <small>
                Ammo {formatPreciseNumber(spendEstimate.ammoSpent)} | Food{' '}
                {formatPreciseNumber(spendEstimate.foodSpent)} | Pill{' '}
                {formatPreciseNumber(spendEstimate.pillSpent)} | Equipment{' '}
                {formatPreciseNumber(spendEstimate.equipmentSpent)}
              </small>
              {spendEstimate.isPartial ? (
                <small>
                  {spendEstimate.unpricedEquipmentCount} equipment items unpriced.
                </small>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
