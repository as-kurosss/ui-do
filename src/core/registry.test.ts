import { describe, it, expect } from 'vitest'
import { canContain, REGISTRY, REGISTRY_BY_ID, getComponentDef } from './registry'

describe('REGISTRY', () => {
  it('contains all 22 MVP components', () => {
    const ids = REGISTRY.map((def) => def.id).sort()
    expect(ids).toEqual([
      'Alert', 'Avatar', 'Badge', 'Button', 'Card', 'CardContent',
      'CardDescription', 'CardFooter', 'CardHeader', 'CardTitle',
      'Checkbox', 'Input', 'Label', 'Progress', 'Select', 'Separator',
      'Switch', 'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Textarea',
    ])
  })

  it('all components are indexable by id', () => {
    for (const def of REGISTRY) {
      expect(REGISTRY_BY_ID[def.id]).toBe(def)
    }
  })
})

describe('getComponentDef', () => {
  it('returns undefined for unknown component', () => {
    expect(getComponentDef('NonExistent')).toBeUndefined()
  })
})

describe('canContain', () => {
  describe('Card', () => {
    it('accepts CardHeader', () => {
      expect(canContain('Card', 'CardHeader')).toBe(true)
    })
    it('accepts CardContent', () => {
      expect(canContain('Card', 'CardContent')).toBe(true)
    })
    it('accepts CardFooter', () => {
      expect(canContain('Card', 'CardFooter')).toBe(true)
    })
    it('rejects CardTitle (only through CardHeader)', () => {
      expect(canContain('Card', 'CardTitle')).toBe(false)
    })
    it('rejects Button', () => {
      expect(canContain('Card', 'Button')).toBe(false)
    })
    it('rejects Tabs', () => {
      expect(canContain('Card', 'Tabs')).toBe(false)
    })
  })

  describe('CardHeader', () => {
    it('accepts CardTitle', () => {
      expect(canContain('CardHeader', 'CardTitle')).toBe(true)
    })
    it('accepts CardDescription', () => {
      expect(canContain('CardHeader', 'CardDescription')).toBe(true)
    })
    it('rejects Button', () => {
      expect(canContain('CardHeader', 'Button')).toBe(false)
    })
  })

  describe('CardContent', () => {
    it('accepts Button', () => {
      expect(canContain('CardContent', 'Button')).toBe(true)
    })
    it('rejects Card', () => {
      expect(canContain('CardContent', 'Card')).toBe(false)
    })
    it('rejects CardHeader', () => {
      expect(canContain('CardContent', 'CardHeader')).toBe(false)
    })
    it('rejects Tabs', () => {
      expect(canContain('CardContent', 'Tabs')).toBe(false)
    })
  })

  describe('Tabs', () => {
    it('accepts TabsList', () => {
      expect(canContain('Tabs', 'TabsList')).toBe(true)
    })
    it('accepts TabsContent', () => {
      expect(canContain('Tabs', 'TabsContent')).toBe(true)
    })
    it('rejects TabsTrigger', () => {
      expect(canContain('Tabs', 'TabsTrigger')).toBe(false)
    })
    it('rejects Button', () => {
      expect(canContain('Tabs', 'Button')).toBe(false)
    })
  })

  describe('TabsList', () => {
    it('accepts TabsTrigger', () => {
      expect(canContain('TabsList', 'TabsTrigger')).toBe(true)
    })
    it('rejects Button', () => {
      expect(canContain('TabsList', 'Button')).toBe(false)
    })
  })

  describe('leaf components', () => {
    it('Button rejects any child', () => {
      expect(canContain('Button', 'Button')).toBe(false)
    })
    it('Input rejects any child', () => {
      expect(canContain('Input', 'Button')).toBe(false)
    })
    it('Label rejects any child', () => {
      expect(canContain('Label', 'Textarea')).toBe(false)
    })
  })

  it('unknown parent accepts everything', () => {
    expect(canContain('Unknown', 'Button')).toBe(true)
  })

  it('new node (null child) is always accepted', () => {
    expect(canContain('Button', null)).toBe(true)
    expect(canContain('Card', null)).toBe(true)
    expect(canContain('CardTitle', null)).toBe(true)
  })
})
