import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface RateCard {
  id: string;
  hire_type: string;
  bus_type_id: string;
  from_km: number;
  to_km: number;
  flat_fee_lkr: number;
  is_active: boolean;
  bus_types?: { name: string };
}

interface BusType {
  id: string;
  name: string;
}

export function RateCoverageMaps() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rateCardsResult, busTypesResult] = await Promise.all([
        supabase
          .from('hire_rate_cards')
          .select(`
            *,
            bus_types:bus_type_id (name)
          `)
          .eq('is_active', true)
          .order('hire_type')
          .order('from_km'),
        supabase
          .from('bus_types')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
      ]);

      if (rateCardsResult.error) throw rateCardsResult.error;
      if (busTypesResult.error) throw busTypesResult.error;

      setRateCards(rateCardsResult.data || []);
      setBusTypes(busTypesResult.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageForType = (hireType: string, busTypeId: string) => {
    return rateCards
      .filter(card => card.hire_type === hireType && card.bus_type_id === busTypeId)
      .sort((a, b) => a.from_km - b.from_km);
  };

  const getDistanceColor = (distance: number) => {
    if (distance <= 50) return 'bg-green-500';
    if (distance <= 200) return 'bg-yellow-500';
    if (distance <= 500) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) return <div>Loading coverage maps...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Card Coverage Maps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {['Outside', 'Lyceum'].map(hireType => (
              <div key={hireType} className="space-y-4">
                <h3 className="text-lg font-semibold">{hireType} Hire</h3>
                
                <div className="space-y-3">
                  {busTypes.map(busType => {
                    const coverage = getCoverageForType(hireType, busType.id);
                    
                    return (
                      <div key={busType.id} className="space-y-2">
                        <h4 className="font-medium">{busType.name}</h4>
                        
                        {coverage.length === 0 ? (
                          <Badge variant="destructive">No Coverage</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {coverage.map(card => (
                              <Badge
                                key={card.id}
                                variant="outline"
                                className={`${getDistanceColor(card.to_km)} text-white border-0`}
                              >
                                {card.from_km}-{card.to_km === 999999 ? '∞' : card.to_km}km
                                <span className="ml-1 text-xs">
                                  (LKR {card.flat_fee_lkr?.toLocaleString()})
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Check for gaps */}
                        {coverage.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {coverage.reduce((gaps, card, index) => {
                              if (index === 0 && card.from_km > 0) {
                                gaps.push(`0-${card.from_km - 1}km`);
                              }
                              if (index < coverage.length - 1) {
                                const nextCard = coverage[index + 1];
                                if (card.to_km + 1 < nextCard.from_km) {
                                  gaps.push(`${card.to_km + 1}-${nextCard.from_km - 1}km`);
                                }
                              }
                              return gaps;
                            }, [] as string[]).length > 0 && (
                              <span className="text-red-600">
                                Gaps: {coverage.reduce((gaps, card, index) => {
                                  if (index === 0 && card.from_km > 0) {
                                    gaps.push(`0-${card.from_km - 1}km`);
                                  }
                                  if (index < coverage.length - 1) {
                                    const nextCard = coverage[index + 1];
                                    if (card.to_km + 1 < nextCard.from_km) {
                                      gaps.push(`${card.to_km + 1}-${nextCard.from_km - 1}km`);
                                    }
                                  }
                                  return gaps;
                                }, [] as string[]).join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-2">Legend</h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>0-50km</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>51-200km</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>201-500km</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>500km+</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}