'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { POSITIONS, type MissionInput, type Position } from '@/lib/types';

interface MissionFormData extends MissionInput {
  id: string;
}

function createEmptyMission(): MissionFormData {
  return {
    id: crypto.randomUUID(),
    weight: 0,
    m1_missionName: '',
    m2_backgroundGoal: '',
    m3_contentDifficulty: '',
    m4_stakeholdersRole: '',
    m5_feasibilityEvidence: '',
  };
}

interface CheckFormProps {
  onSubmit: (position: Position, missions: MissionInput[]) => void;
  isLoading: boolean;
}

export function CheckForm({ onSubmit, isLoading }: CheckFormProps) {
  const [position, setPosition] = useState<Position | ''>('');
  const [missions, setMissions] = useState<MissionFormData[]>([createEmptyMission()]);

  const totalWeight = missions.reduce((sum, m) => sum + (m.weight || 0), 0);

  function updateMission(id: string, field: keyof MissionInput, value: string | number) {
    setMissions(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
  }

  function addMission() {
    setMissions(prev => [...prev, createEmptyMission()]);
  }

  function removeMission(id: string) {
    if (missions.length <= 1) return;
    setMissions(prev => prev.filter(m => m.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!position) return;
    const missionInputs: MissionInput[] = missions.map(({ id: _id, ...rest }) => rest);
    onSubmit(position as Position, missionInputs);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="position">役職</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
              <SelectTrigger id="position">
                <SelectValue placeholder="役職を選択" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {missions.map((mission, index) => (
        <Card key={mission.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>ミッション {index + 1}</CardTitle>
            {missions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMission(mission.id)}
                className="text-red-500 hover:text-red-700"
              >
                削除
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ウェイト（%）</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={mission.weight || ''}
                onChange={e => updateMission(mission.id, 'weight', Number(e.target.value))}
                placeholder="例: 30"
              />
            </div>

            <div className="space-y-2">
              <Label>M1: ミッション名</Label>
              <Input
                value={mission.m1_missionName}
                onChange={e => updateMission(mission.id, 'm1_missionName', e.target.value)}
                placeholder="ミッションの名称を入力"
              />
            </div>

            <div className="space-y-2">
              <Label>M2: 背景・課題と1年後に目指すゴール</Label>
              <Textarea
                value={mission.m2_backgroundGoal}
                onChange={e => updateMission(mission.id, 'm2_backgroundGoal', e.target.value)}
                placeholder="背景や課題、ゴールを記述"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>M3: ミッションの内容や難易度</Label>
              <Textarea
                value={mission.m3_contentDifficulty}
                onChange={e => updateMission(mission.id, 'm3_contentDifficulty', e.target.value)}
                placeholder="具体的な内容や難易度を記述"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>M4: 関係先・巻き込む相手・自分の役割</Label>
              <Textarea
                value={mission.m4_stakeholdersRole}
                onChange={e => updateMission(mission.id, 'm4_stakeholdersRole', e.target.value)}
                placeholder="関係先や自分の立ち位置を記述"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>M5: ミッション完遂の根拠</Label>
              <Textarea
                value={mission.m5_feasibilityEvidence}
                onChange={e => updateMission(mission.id, 'm5_feasibilityEvidence', e.target.value)}
                placeholder="実現可能性の根拠を記述"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" onClick={addMission}>
          + ミッションを追加
        </Button>
        <span className={`text-sm ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
          ウェイト合計: {totalWeight}%{totalWeight !== 100 && '（100%にしてください）'}
        </span>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isLoading || !position || totalWeight !== 100}
      >
        {isLoading ? 'AI採点中...' : 'AI採点を実行'}
      </Button>
    </form>
  );
}
