import { Handle, Position } from "reactflow";
import { KeyRound, Link2, ShieldCheck } from "lucide-react";

export default function TableNode({ data, selected }) {
    function handleDoubleClick(event) {
        event.stopPropagation();

        if (typeof data.onDoubleClick === "function") {
            data.onDoubleClick(data.name);
        }
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={[
                "min-w-[280px] overflow-hidden rounded-2xl border bg-white shadow-soft",
                "cursor-grab select-none active:cursor-grabbing dark:bg-slate-950",
                "font-sans tracking-[0.01em]",
                selected
                    ? "border-blue-500 ring-4 ring-blue-100 dark:ring-blue-950"
                    : "border-slate-200 dark:border-slate-700"
            ].join(" ")}
        >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[15px] font-extrabold uppercase tracking-wide text-slate-950 dark:text-slate-50">
                    {data.name}
                </div>

                <div className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    table
                </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.fields.map((field) => (
                    <div
                        key={field.id}
                        className="relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`target-${field.id}`}
                            className="nodrag !left-[-6px] !h-3 !w-3 !border-2 !border-white !bg-blue-600"
                            isConnectable={true}
                        />

                        <div className="pointer-events-none min-w-0">
                            <div className="flex items-center gap-2">
                                {field.pk && <KeyRound size={14} className="text-amber-500" />}
                                {field.fk && <Link2 size={14} className="text-blue-500" />}
                                {field.unique && (
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                )}

                                <span className="truncate text-[14px] font-bold text-slate-900 dark:text-slate-50">
                  {field.name}
                </span>
                            </div>

                            <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {field.type}
                                {!field.nullable && " · NOT NULL"}
                            </div>
                        </div>

                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`source-${field.id}`}
                            className="nodrag !right-[-6px] !h-3 !w-3 !border-2 !border-white !bg-blue-600"
                            isConnectable={true}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}