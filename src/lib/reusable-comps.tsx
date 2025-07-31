import { FieldType, InputType, simpleInputTypes } from "@/lib/types";
import { X } from "lucide-react";

export const DrawerMenu = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col mr-4 w-[calc(100%-6px)] h-[94vh] overflow-y-auto select-none">
    {children}
  </div>
);

export const DrawerMenuLabel = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div className="flex select-none items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
    {children}
  </div>
);

// Reusable Documentation Component
export const FormDocumentation = ({
  documentation,
  onChange,
  placeholder = "Add documentation...",
}: {
  documentation: string | undefined;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) => (
  <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
    <div className="font-bold text-[16px]">Documentation</div>
    <textarea
      className="bg-white rounded-sm min-h-16 max-h-64 p-1 h-16 text-[14px]"
      value={documentation}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
);

// Reusable Form Input Component
export const FormField = ({
  label,
  children,
  className = "grid-cols-3",
  newClassName = false,
  ...props
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  newClassName?: boolean;
  [key: string]: any;
}) => (
  <div
    className={
      newClassName ? className : `grid items-center gap-4 ${className}`
    }
    {...props}
  >
    <label>{label}</label>
    {children}
  </div>
);

// Reusable Input Component
export const FormInput = ({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) => (
  <>
    <label>{label}</label>
    <input
      className={`col-span-2 h-9 bg-white rounded-sm px-1 font-mono ${
        required && !value ? "border-red-500 border-1" : ""
      } ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </>
);

// Reusable Textarea Component
export const FormTextarea = ({
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  rows = 1,
  ...props
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
  [key: string]: any;
}) => {
  const baseHeight =
    rows === 1 ? "min-h-9 h-9" : `min-h-${rows * 6} h-${rows * 6}`;

  return (
    <textarea
      className={`col-span-2 ${baseHeight} max-h-24 bg-white rounded-sm px-1 py-[5px] font-mono ${
        required && !value ? "border-red-500 border-1" : ""
      } ${className}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  );
};

// Reusable Select Component
export const FormSelect = ({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  ...props
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) => (
  <select
    className={`col-span-2 h-9 bg-white rounded-sm font-mono ${className}`}
    value={value}
    onChange={onChange}
    disabled={disabled}
    {...props}
  >
    {options.map((option, index) => (
      <option key={index} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Checkbox Component
export const FormCheckbox = ({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) => (
  <div className="flex gap-1 items-center">
    <label>{label}</label>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);

// Reusable Button Component
export const Button = ({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  className = "",
  ...props
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
}) => {
  const variants = {
    primary: "bg-black text-white",
    secondary: "bg-gray-300 text-black",
    danger: "bg-red-500 text-white w-8",
  };

  return (
    <button
      onClick={onClick}
      className={`h-9 rounded-sm cursor-pointer font-semibold hover:opacity-75 ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Record Field Manager Component
export const RecordFieldManager = ({
  input,
  setInput,
  recordField,
  setRecordField,
  disabled = false,
}: {
  input: InputType;
  setInput: React.Dispatch<React.SetStateAction<InputType>>;
  recordField: FieldType;
  setRecordField: React.Dispatch<React.SetStateAction<FieldType>>;
  disabled?: boolean;
}) => {
  const handleAddField = () => {
    if (recordField.var && input.type === "Record") {
      setInput((prev) => {
        const recordInput = prev as { type: "Record"; record: FieldType[] };
        return {
          ...recordInput,
          record: [...(recordInput.record ?? []), recordField],
        };
      });
      setRecordField({ var: "", type: simpleInputTypes[0] });
    }
  };

  const handleRemoveField = (index: number) => {
    setInput((prev) => {
      const recordInput = prev as { type: "Record"; record: FieldType[] };
      return {
        ...recordInput,
        record: recordInput.record.filter((_, i) => i !== index),
      };
    });
  };

  const typeOptions = simpleInputTypes.map((type) => ({
    value: type,
    label: type,
  }));

  return (
    <>
      <label className="col-span-3 flex justify-center font-bold text-sm">
        Record Fields
      </label>

      {!disabled && (
        <>
          <FormField className="grid grid-cols-3" newClassName label="Label">
            <input
              className="col-span-2 h-8 bg-white rounded-sm font-mono px-1"
              value={recordField.var}
              placeholder="Field Name"
              onChange={(e) =>
                setRecordField((prev) => ({ ...prev, var: e.target.value }))
              }
            />
          </FormField>

          <FormField
            label="Type"
            newClassName={true}
            className="grid grid-cols-3"
          >
            <FormSelect
              value={recordField.type}
              onChange={(e) =>
                setRecordField((prev) => ({ ...prev, type: e.target.value }))
              }
              options={typeOptions}
              className="col-span-1"
            />
          </FormField>

          <Button onClick={handleAddField} className="col-span-3">
            Add Field
          </Button>
        </>
      )}

      {"record" in input &&
        input.record?.map((field, index) => (
          <div
            key={index}
            className="col-span-3 flex justify-between items-center"
          >
            <label className="font-mono">
              {field.var}: {field.type}
            </label>
            {!disabled && (
              <Button variant="danger" onClick={() => handleRemoveField(index)}>
                X
              </Button>
            )}
          </div>
        ))}
    </>
  );
};

export const Modal = ({
  className = "",
  open,
  onClose,
  children,
}: {
  className?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 flex justify-center items-center transition-colors ${
        open ? "visible bg-black/20" : "invisible"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-xl shadow p-6 transition-all ${
          open ? "scale-100 opacity-100" : "scale-125 opacity-0"
        } ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-lg text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600"
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
};
