import type { ComponentType } from 'react';
import { Alert as AlertPrimitive } from '@/components/ui/alert';
import { Avatar as AvatarPrimitive } from '@/components/ui/avatar';
import { Badge as BadgePrimitive } from '@/components/ui/badge';
import { Button as ButtonPrimitive } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Checkbox as CheckboxPrimitive } from '@/components/ui/checkbox';
import { Input as InputPrimitive } from '@/components/ui/input';
import { Label as LabelPrimitive } from '@/components/ui/label';
import { Progress as ProgressPrimitive } from '@/components/ui/progress';
import { Select as SelectPrimitive } from '@/components/ui/select';
import { Separator as SeparatorPrimitive } from '@/components/ui/separator';
import { Switch as SwitchPrimitive } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea as TextareaPrimitive } from '@/components/ui/textarea';

/**
 * Динамическая карта: registry component id → React-компонент.
 * shadcn-компоненты пробрасывают props (data-bn-id, className, onClick) на корневой элемент.
 */
export const COMPONENT_MAP: Record<string, ComponentType<any>> = {
  Alert: AlertPrimitive,
  Avatar: AvatarPrimitive,
  Badge: BadgePrimitive,
  Button: ButtonPrimitive,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Checkbox: CheckboxPrimitive,
  Input: InputPrimitive,
  Label: LabelPrimitive,
  Progress: ProgressPrimitive,
  Select: SelectPrimitive,
  Separator: SeparatorPrimitive,
  Switch: SwitchPrimitive,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea: TextareaPrimitive,
};
