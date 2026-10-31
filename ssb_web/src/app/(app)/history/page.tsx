"use client";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { attemptDate, HISTORY_TESTS, useHistory } from "@/lib/use-history";

export default function HistoryPage() {
  const { data, failed, loading, refresh } = useHistory();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl font-black uppercase leading-none">Your progress</h1>
        <p className="mt-3 text-muted-foreground">Every scored attempt, newest first.</p>
      </div>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <span>Could not load your attempts. Check your connection or try again.</span>
          <Button size="sm" variant="outline" onClick={() => refresh()}>Try again</Button>
        </div>
      )}

      {loading && <div className="h-48 animate-pulse rounded-2xl bg-white/5" role="status" aria-label="Loading attempts" />}

      {data && (
        <Tabs defaultValue="ppdt">
          <TabsList className="flex-wrap">
            {HISTORY_TESTS.map((t) => (
              <TabsTrigger key={t} value={t} className="uppercase">{t} <span className="ml-1.5 text-muted-foreground">{data[t].length}</span></TabsTrigger>
            ))}
          </TabsList>
          {HISTORY_TESTS.map((t) => (
            <TabsContent key={t} value={t} className="space-y-3">
              {!data[t].length && <p className="py-6 text-muted-foreground">No {t.toUpperCase()} attempts yet. Your first one will appear here.</p>}
              {data[t].map((a, i) => (
                <Card key={a.id ?? i}>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">{attemptDate(a.completedAt)?.toLocaleString() ?? "Attempt"}</CardTitle>
                    <Badge>{t === "oir" ? `${a.score}/${a.totalQuestions}` : `${a.score ?? 0}/10`}</Badge>
                  </CardHeader>
                  {a.aiFeedback && <CardContent><Markdown>{a.aiFeedback}</Markdown></CardContent>}
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
