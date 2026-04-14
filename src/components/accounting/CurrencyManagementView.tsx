import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useCurrencies, useExchangeRates } from "@/hooks/useAccountingData";
import { useCreateCurrency, useCreateExchangeRate, useUpdateExchangeRate } from "@/hooks/useAccountingMutations";
import { toast } from "sonner";
import { format } from "date-fns";

export const CurrencyManagementView = () => {
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: exchangeRates = [], isLoading: loadingRates } = useExchangeRates();
  const createCurrency = useCreateCurrency();
  const createExchangeRate = useCreateExchangeRate();
  const updateExchangeRate = useUpdateExchangeRate();

  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    currency_code: "",
    currency_name: "",
    symbol: "",
    decimal_places: 2,
    is_active: true,
  });
  const [newRate, setNewRate] = useState({
    from_currency: "USD",
    to_currency: "LKR",
    rate: "",
    effective_date: format(new Date(), "yyyy-MM-dd"),
  });

  const handleCreateCurrency = async () => {
    if (!newCurrency.currency_code || !newCurrency.currency_name) {
      toast.error("Currency code and name are required");
      return;
    }
    try {
      await createCurrency.mutateAsync(newCurrency as any);
      toast.success("Currency created successfully");
      setCurrencyDialogOpen(false);
      setNewCurrency({
        currency_code: "",
        currency_name: "",
        symbol: "",
        decimal_places: 2,
        is_active: true,
      });
    } catch (error) {
      toast.error("Failed to create currency");
    }
  };

  const handleCreateRate = async () => {
    if (!newRate.rate) {
      toast.error("Exchange rate is required");
      return;
    }
    try {
      await createExchangeRate.mutateAsync({
        ...newRate,
        rate: parseFloat(newRate.rate),
      } as any);
      toast.success("Exchange rate added successfully");
      setRateDialogOpen(false);
      setNewRate({
        from_currency: "USD",
        to_currency: "LKR",
        rate: "",
        effective_date: format(new Date(), "yyyy-MM-dd"),
      });
    } catch (error) {
      toast.error("Failed to add exchange rate");
    }
  };

  const baseCurrency = currencies.find((c: any) => c.is_base_currency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Currency Management</h2>
          <p className="text-muted-foreground">
            Manage currencies and exchange rates for multi-currency accounting
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Currency</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency?.currency_code || "LKR"}
            </div>
            <p className="text-xs text-muted-foreground">
              {baseCurrency?.currency_name || "Sri Lankan Rupee"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencies.filter((c: any) => c.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {currencies.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exchange Rates</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exchangeRates.length}</div>
            <p className="text-xs text-muted-foreground">active rates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMM dd, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="currencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="revaluation">Revaluation</TabsTrigger>
        </TabsList>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Currency Master</CardTitle>
              <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Currency
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Currency</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Currency Code *</Label>
                        <Input
                          placeholder="USD"
                          maxLength={3}
                          value={newCurrency.currency_code}
                          onChange={(e) =>
                            setNewCurrency({
                              ...newCurrency,
                              currency_code: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Input
                          placeholder="$"
                          value={newCurrency.symbol}
                          onChange={(e) =>
                            setNewCurrency({ ...newCurrency, symbol: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Name *</Label>
                      <Input
                        placeholder="US Dollar"
                        value={newCurrency.currency_name}
                        onChange={(e) =>
                          setNewCurrency({
                            ...newCurrency,
                            currency_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Decimal Places</Label>
                        <Input
                          type="number"
                          min={0}
                          max={4}
                          value={newCurrency.decimal_places}
                          onChange={(e) =>
                            setNewCurrency({
                              ...newCurrency,
                              decimal_places: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          checked={newCurrency.is_active}
                          onCheckedChange={(checked) =>
                            setNewCurrency({ ...newCurrency, is_active: checked })
                          }
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    <Button onClick={handleCreateCurrency} className="w-full">
                      Create Currency
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Decimals</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCurrencies ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading currencies...
                      </TableCell>
                    </TableRow>
                  ) : currencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No currencies configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    currencies.map((currency: any) => (
                      <TableRow key={currency.id}>
                        <TableCell className="font-medium">
                          {currency.currency_code}
                        </TableCell>
                        <TableCell>{currency.currency_name}</TableCell>
                        <TableCell>{currency.symbol}</TableCell>
                        <TableCell>{currency.decimal_places}</TableCell>
                        <TableCell>
                          <Badge
                            variant={currency.is_active ? "default" : "secondary"}
                          >
                            {currency.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {currency.is_base_currency && (
                            <Badge variant="outline">Base Currency</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Exchange Rates</CardTitle>
              <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Exchange Rate</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Currency</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={newRate.from_currency}
                          onChange={(e) =>
                            setNewRate({ ...newRate, from_currency: e.target.value })
                          }
                        >
                          {currencies
                            .filter((c: any) => !c.is_base_currency)
                            .map((c: any) => (
                              <option key={c.id} value={c.currency_code}>
                                {c.currency_code} - {c.currency_name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>To Currency</Label>
                        <Input
                          value={baseCurrency?.currency_code || "LKR"}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Exchange Rate *</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="325.00"
                          value={newRate.rate}
                          onChange={(e) =>
                            setNewRate({ ...newRate, rate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Effective Date</Label>
                        <Input
                          type="date"
                          value={newRate.effective_date}
                          onChange={(e) =>
                            setNewRate({ ...newRate, effective_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateRate} className="w-full">
                      Add Exchange Rate
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRates ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Loading exchange rates...
                      </TableCell>
                    </TableRow>
                  ) : exchangeRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No exchange rates configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    exchangeRates.map((rate: any) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {rate.from_currency}
                        </TableCell>
                        <TableCell>{rate.to_currency}</TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(rate.rate).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(rate.effective_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rate.source || "Manual"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Foreign Currency Revaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  Currency Revaluation
                </h3>
                <p className="max-w-md mx-auto">
                  Run periodic revaluation of foreign currency balances to
                  recognize unrealized gains/losses based on current exchange
                  rates.
                </p>
                <Button className="mt-4" variant="outline">
                  Run Revaluation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
