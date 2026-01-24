'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { MoveDefinition, MoveFunction, MoveStruct, MoveParam, MoveVisibility, MoveType } from '@/types';

interface MoveDefinitionBuilderProps {
  value?: MoveDefinition;
  onChange: (definition: MoveDefinition) => void;
}

const MOVE_TYPES: MoveType[] = ['u8', 'u64', 'u128', 'u256', 'bool', 'address', 'vector', 'string', 'signer'];
const VISIBILITIES: MoveVisibility[] = ['public', 'entry', 'private'];

// Separate component for return type input to handle comma-separated values properly
function ReturnTypeInput({ value, onChange }: { value?: string[]; onChange: (types: string[] | undefined) => void }) {
  const [localValue, setLocalValue] = useState(value?.join(', ') || '');

  // Sync with external value when it changes
  useEffect(() => {
    setLocalValue(value?.join(', ') || '');
  }, [value]);

  const handleBlur = () => {
    const types = localValue
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onChange(types.length > 0 ? types : undefined);
  };

  return (
    <Input
      label="Return Type (comma separated)"
      placeholder="u64, bool"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
}

export function MoveDefinitionBuilder({ value, onChange }: MoveDefinitionBuilderProps) {
  const [expandedFunctions, setExpandedFunctions] = useState<Set<number>>(new Set([0]));
  const [expandedStructs, setExpandedStructs] = useState<Set<number>>(new Set());

  const definition: MoveDefinition = value || {
    moduleName: '',
    moduleAddress: '',
    functions: [],
    structs: [],
  };

  const updateDefinition = (updates: Partial<MoveDefinition>) => {
    onChange({ ...definition, ...updates });
  };

  const addFunction = () => {
    const newFunc: MoveFunction = {
      name: '',
      visibility: 'public',
      params: [],
      isView: false,
    };
    updateDefinition({ functions: [...definition.functions, newFunc] });
    setExpandedFunctions(new Set([...expandedFunctions, definition.functions.length]));
  };

  const updateFunction = (index: number, updates: Partial<MoveFunction>) => {
    const newFunctions = [...definition.functions];
    newFunctions[index] = { ...newFunctions[index], ...updates };
    updateDefinition({ functions: newFunctions });
  };

  const removeFunction = (index: number) => {
    updateDefinition({ functions: definition.functions.filter((_, i) => i !== index) });
  };

  const addParam = (funcIndex: number) => {
    const newParam: MoveParam = { name: '', type: 'u64' };
    const newFunctions = [...definition.functions];
    newFunctions[funcIndex] = {
      ...newFunctions[funcIndex],
      params: [...newFunctions[funcIndex].params, newParam],
    };
    updateDefinition({ functions: newFunctions });
  };

  const updateParam = (funcIndex: number, paramIndex: number, updates: Partial<MoveParam>) => {
    const newFunctions = [...definition.functions];
    const newParams = [...newFunctions[funcIndex].params];
    newParams[paramIndex] = { ...newParams[paramIndex], ...updates };
    newFunctions[funcIndex] = { ...newFunctions[funcIndex], params: newParams };
    updateDefinition({ functions: newFunctions });
  };

  const removeParam = (funcIndex: number, paramIndex: number) => {
    const newFunctions = [...definition.functions];
    newFunctions[funcIndex] = {
      ...newFunctions[funcIndex],
      params: newFunctions[funcIndex].params.filter((_, i) => i !== paramIndex),
    };
    updateDefinition({ functions: newFunctions });
  };

  const addStruct = () => {
    const newStruct: MoveStruct = { name: '', fields: [] };
    updateDefinition({ structs: [...definition.structs, newStruct] });
    setExpandedStructs(new Set([...expandedStructs, definition.structs.length]));
  };

  const updateStruct = (index: number, updates: Partial<MoveStruct>) => {
    const newStructs = [...definition.structs];
    newStructs[index] = { ...newStructs[index], ...updates };
    updateDefinition({ structs: newStructs });
  };

  const removeStruct = (index: number) => {
    updateDefinition({ structs: definition.structs.filter((_, i) => i !== index) });
  };

  const addStructField = (structIndex: number) => {
    const newStructs = [...definition.structs];
    newStructs[structIndex] = {
      ...newStructs[structIndex],
      fields: [...newStructs[structIndex].fields, { name: '', type: 'u64' }],
    };
    updateDefinition({ structs: newStructs });
  };

  const updateStructField = (structIndex: number, fieldIndex: number, updates: { name?: string; type?: MoveType }) => {
    const newStructs = [...definition.structs];
    const newFields = [...newStructs[structIndex].fields];
    newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates };
    newStructs[structIndex] = { ...newStructs[structIndex], fields: newFields };
    updateDefinition({ structs: newStructs });
  };

  const removeStructField = (structIndex: number, fieldIndex: number) => {
    const newStructs = [...definition.structs];
    newStructs[structIndex] = {
      ...newStructs[structIndex],
      fields: newStructs[structIndex].fields.filter((_, i) => i !== fieldIndex),
    };
    updateDefinition({ structs: newStructs });
  };

  const toggleFunction = (index: number) => {
    const newExpanded = new Set(expandedFunctions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFunctions(newExpanded);
  };

  const toggleStruct = (index: number) => {
    const newExpanded = new Set(expandedStructs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedStructs(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Module Info */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Module Address"
          placeholder="0x1"
          value={definition.moduleAddress}
          onChange={(e) => updateDefinition({ moduleAddress: e.target.value })}
        />
        <Input
          label="Module Name"
          placeholder="my_module"
          value={definition.moduleName}
          onChange={(e) => updateDefinition({ moduleName: e.target.value })}
        />
      </div>

      {/* Functions */}
      <div className="border border-coco-border-subtle rounded-lg">
        <div className="flex items-center justify-between p-3 border-b border-coco-border-subtle bg-coco-bg-secondary">
          <span className="text-sm font-medium text-coco-text-primary">
            Functions ({definition.functions.length})
          </span>
          <Button variant="secondary" size="sm" onClick={addFunction}>
            <Plus className="w-3 h-3 mr-1" /> Add Function
          </Button>
        </div>

        {definition.functions.length === 0 ? (
          <div className="p-4 text-center text-sm text-coco-text-tertiary">
            No functions defined. Click "Add Function" to create one.
          </div>
        ) : (
          <div className="divide-y divide-coco-border-subtle">
            {definition.functions.map((func, funcIndex) => (
              <div key={funcIndex} className="bg-coco-bg-primary">
                <div
                  onClick={() => toggleFunction(funcIndex)}
                  className="w-full flex items-center justify-between p-3 hover:bg-coco-bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedFunctions.has(funcIndex) ? (
                      <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
                    )}
                    <span className="text-sm font-mono text-coco-text-primary">
                      {func.name || '(unnamed)'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-coco-bg-tertiary text-coco-text-secondary">
                      {func.visibility}
                    </span>
                    {func.isView && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-coco-accent/20 text-coco-accent">
                        view
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFunction(funcIndex);
                    }}
                    className="p-1 text-coco-text-tertiary hover:text-coco-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {expandedFunctions.has(funcIndex) && (
                  <div className="px-3 pb-3 space-y-3 bg-coco-bg-secondary">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Name"
                        placeholder="function_name"
                        value={func.name}
                        onChange={(e) => updateFunction(funcIndex, { name: e.target.value })}
                      />
                      <div>
                        <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
                          Visibility
                        </label>
                        <select
                          value={func.visibility}
                          onChange={(e) => updateFunction(funcIndex, { visibility: e.target.value as MoveVisibility })}
                          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent"
                        >
                          {VISIBILITIES.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-coco-text-secondary">
                          <input
                            type="checkbox"
                            checked={func.isView || false}
                            onChange={(e) => updateFunction(funcIndex, { isView: e.target.checked })}
                            className="rounded border-coco-border-default"
                          />
                          View function
                        </label>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-coco-text-secondary">Parameters</span>
                        <button
                          type="button"
                          onClick={() => addParam(funcIndex)}
                          className="text-xs text-coco-accent hover:text-coco-accent-hover"
                        >
                          + Add param
                        </button>
                      </div>
                      {func.params.length === 0 ? (
                        <p className="text-xs text-coco-text-tertiary">No parameters</p>
                      ) : (
                        <div className="space-y-2">
                          {func.params.map((param, paramIndex) => (
                            <div key={paramIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="param_name"
                                value={param.name}
                                onChange={(e) => updateParam(funcIndex, paramIndex, { name: e.target.value })}
                                className="flex-1 px-2 py-1 text-sm bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                              />
                              <input
                                type="text"
                                placeholder="u64"
                                value={param.type}
                                onChange={(e) => updateParam(funcIndex, paramIndex, { type: e.target.value })}
                                className="w-40 px-2 py-1 text-sm bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                                list={`param-types-${funcIndex}-${paramIndex}`}
                              />
                              <datalist id={`param-types-${funcIndex}-${paramIndex}`}>
                                {MOVE_TYPES.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                              <button
                                type="button"
                                onClick={() => removeParam(funcIndex, paramIndex)}
                                className="p-1 text-coco-text-tertiary hover:text-coco-error"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Return Type */}
                    <ReturnTypeInput
                      value={func.returnType}
                      onChange={(types) => updateFunction(funcIndex, { returnType: types })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Structs */}
      <div className="border border-coco-border-subtle rounded-lg">
        <div className="flex items-center justify-between p-3 border-b border-coco-border-subtle bg-coco-bg-secondary">
          <span className="text-sm font-medium text-coco-text-primary">
            Structs ({definition.structs.length})
          </span>
          <Button variant="secondary" size="sm" onClick={addStruct}>
            <Plus className="w-3 h-3 mr-1" /> Add Struct
          </Button>
        </div>

        {definition.structs.length === 0 ? (
          <div className="p-4 text-center text-sm text-coco-text-tertiary">
            No structs defined. Click "Add Struct" to create one.
          </div>
        ) : (
          <div className="divide-y divide-coco-border-subtle">
            {definition.structs.map((struct, structIndex) => (
              <div key={structIndex} className="bg-coco-bg-primary">
                <button
                  type="button"
                  onClick={() => toggleStruct(structIndex)}
                  className="w-full flex items-center justify-between p-3 hover:bg-coco-bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedStructs.has(structIndex) ? (
                      <ChevronDown className="w-4 h-4 text-coco-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-coco-text-tertiary" />
                    )}
                    <span className="text-sm font-mono text-coco-text-primary">
                      {struct.name || '(unnamed)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStruct(structIndex);
                    }}
                    className="p-1 text-coco-text-tertiary hover:text-coco-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>

                {expandedStructs.has(structIndex) && (
                  <div className="px-3 pb-3 space-y-3 bg-coco-bg-secondary">
                    <Input
                      label="Struct Name"
                      placeholder="MyStruct"
                      value={struct.name}
                      onChange={(e) => updateStruct(structIndex, { name: e.target.value })}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-coco-text-secondary">Fields</span>
                        <button
                          type="button"
                          onClick={() => addStructField(structIndex)}
                          className="text-xs text-coco-accent hover:text-coco-accent-hover"
                        >
                          + Add field
                        </button>
                      </div>
                      {struct.fields.length === 0 ? (
                        <p className="text-xs text-coco-text-tertiary">No fields</p>
                      ) : (
                        <div className="space-y-2">
                          {struct.fields.map((field, fieldIndex) => (
                            <div key={fieldIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="field_name"
                                value={field.name}
                                onChange={(e) => updateStructField(structIndex, fieldIndex, { name: e.target.value })}
                                className="flex-1 px-2 py-1 text-sm bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                              />
                              <input
                                type="text"
                                placeholder="u64"
                                value={field.type}
                                onChange={(e) => updateStructField(structIndex, fieldIndex, { type: e.target.value })}
                                className="w-40 px-2 py-1 text-sm bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                                list={`field-types-${structIndex}-${fieldIndex}`}
                              />
                              <datalist id={`field-types-${structIndex}-${fieldIndex}`}>
                                {MOVE_TYPES.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                              <button
                                type="button"
                                onClick={() => removeStructField(structIndex, fieldIndex)}
                                className="p-1 text-coco-text-tertiary hover:text-coco-error"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
