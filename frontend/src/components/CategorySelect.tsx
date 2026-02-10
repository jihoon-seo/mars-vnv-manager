import { TextField, MenuItem } from '@mui/material';
import { getCategoryOptions } from '../utils/categories';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  fullWidth?: boolean;
  margin?: 'none' | 'dense' | 'normal';
  size?: 'small' | 'medium';
  emptyLabel?: string;
}

const options = getCategoryOptions();

export default function CategorySelect({
  value,
  onChange,
  label = '카테고리',
  fullWidth = true,
  margin = 'normal',
  size,
  emptyLabel = '미분류',
}: Props) {
  return (
    <TextField
      fullWidth={fullWidth}
      select
      label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      margin={margin}
      size={size}
    >
      <MenuItem value="">{emptyLabel}</MenuItem>
      {options.map(opt => {
        if (opt.level === 1) {
          return (
            <MenuItem key={opt.id} value={opt.id} sx={{ fontWeight: 'bold' }}>
              {opt.label}
            </MenuItem>
          );
        }
        if (opt.level === 2) {
          return (
            <MenuItem key={opt.id} value={opt.id} sx={{ pl: 3, fontWeight: 500 }}>
              {opt.label}
            </MenuItem>
          );
        }
        return (
          <MenuItem key={opt.id} value={opt.id} sx={{ pl: 5, fontSize: '0.875rem' }}>
            {opt.label}
          </MenuItem>
        );
      })}
    </TextField>
  );
}
