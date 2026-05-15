import React, { useState, useEffect, useMemo } from 'react';
import { format, set, isBefore, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const TIMEZONE = 'America/Bogota';

const getBogotaNow = () => toZonedTime(new Date(), TIMEZONE);

const CustomDateTimePicker = ({ label, selected, onChange, error }) => {
  const [bogotaNow] = useState(getBogotaNow());
  const [todayInBogota] = useState(() => startOfDay(getBogotaNow()));
  const [viewDate, setViewDate] = useState(selected || bogotaNow);
  const [selectedDate, setSelectedDate] = useState(selected ? new Date(selected.toDateString()) : null);
  const [selectedTime, setSelectedTime] = useState(
    selected ? `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}` : null
  );
  const [disabledTimes, setDisabledTimes] = useState(new Set());

  useEffect(() => { setDisabledTimes(new Set()); }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hour, minute] = selectedTime.split(':').map(Number);
      const dateTimeLocal = set(selectedDate, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
      onChange(fromZonedTime(dateTimeLocal, TIMEZONE));
    } else {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime]);

  const handleDateSelect = (day) => {
    setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    setSelectedTime(null);
  };

  const changeMonth = (amount) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = format(viewDate, 'MMMM', { locale: es });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const timeSlots = useMemo(() => {
    const slots = [];
    let currentTime = set(new Date(), { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
    const endTime = set(new Date(), { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });
    while (isBefore(currentTime, endTime) || currentTime.getTime() === endTime.getTime()) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }
    return slots;
  }, []);

  const errorBorderClasses = 'border-red-500';
  const defaultBorderClasses = 'border-gold-bright/25';
  const errorLabelClasses = 'text-red-400';
  const defaultLabelClasses = 'text-vecy-muted';

  return (
    <div className="flex flex-col w-full">
      <label className={`mb-2 text-sm font-medium transition-colors duration-300 ${error ? errorLabelClasses : defaultLabelClasses}`}>
        {label}
      </label>

      {/* Contenedor principal — Glassmorphism vibrante */}
      <div
        className={`p-4 rounded-xl border-2 transition-all duration-300 ${error ? errorBorderClasses : defaultBorderClasses}`}
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,10,0.92) 0%, rgba(18,18,18,0.88) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: error
            ? '0 0 20px rgba(220,38,38,0.2)'
            : '0 0 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.1)',
        }}>

        {/* Línea decorativa dorada superior */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)', marginBottom: '1rem' }} />

        {/* Encabezado del Calendario — Flechas iluminadas */}
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(191,149,63,0.12)',
              border: '1px solid rgba(212,175,55,0.35)',
              color: '#d4af37',
              fontSize: '1.5rem',
              lineHeight: 1,
              boxShadow: '0 0 12px rgba(212,175,55,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(191,149,63,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(191,149,63,0.12)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(212,175,55,0.25)'; }}
          >‹</button>

          <div className="text-center">
            <p className="font-bold text-lg capitalize section-legend-gold">{monthName}</p>
            <p className="text-sm" style={{ color: '#a1a1aa' }}>{year}</p>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(191,149,63,0.12)',
              border: '1px solid rgba(212,175,55,0.35)',
              color: '#d4af37',
              fontSize: '1.5rem',
              lineHeight: 1,
              boxShadow: '0 0 12px rgba(212,175,55,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(191,149,63,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(191,149,63,0.12)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(212,175,55,0.25)'; }}
          >›</button>
        </div>

        {/* Grilla del Calendario */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Días de la semana */}
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs font-bold pb-2" style={{ color: '#bf953f', letterSpacing: '0.05em' }}>{day}</div>
          ))}
          {/* Espacios vacíos */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, day) => {
            const dayNumber = day + 1;
            const isPast = isBefore(new Date(year, month, dayNumber), todayInBogota);
            const isSelected = selectedDate &&
              selectedDate.getDate() === dayNumber &&
              selectedDate.getMonth() === month &&
              selectedDate.getFullYear() === year;

            let btnStyle = {};
            let btnClass = 'w-9 h-9 rounded-full transition-all duration-200 text-sm font-medium';

            if (isPast) {
              btnStyle = { color: '#3f3f46', cursor: 'not-allowed' };
            } else if (isSelected) {
              btnStyle = {
                background: 'linear-gradient(135deg, #d4af37 0%, #bf953f 100%)',
                color: '#000000',
                fontWeight: 800,
                boxShadow: '0 0 16px rgba(212,175,55,0.7), 0 0 32px rgba(191,149,63,0.3)',
              };
            } else {
              btnStyle = { color: '#e4e4e7' };
            }

            return (
              <button
                type="button"
                key={dayNumber}
                onClick={() => !isPast && handleDateSelect(dayNumber)}
                disabled={isPast}
                className={btnClass}
                style={btnStyle}
                onMouseEnter={e => { if (!isPast && !isSelected) { e.currentTarget.style.background = 'rgba(191,149,63,0.18)'; e.currentTarget.style.color = '#d4af37'; } }}
                onMouseLeave={e => { if (!isPast && !isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e4e4e7'; } }}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>

        {/* Selector de Hora */}
        {selectedDate && (
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}>
            <p className="text-center text-sm font-semibold mb-3 section-legend-gold">
              Selecciona una hora para el {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}:
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {timeSlots.map(time => {
                const isTimeSelected = selectedTime === time;
                const isToday = selectedDate &&
                  selectedDate.getFullYear() === todayInBogota.getFullYear() &&
                  selectedDate.getMonth() === todayInBogota.getMonth() &&
                  selectedDate.getDate() === todayInBogota.getDate();

                let isTimeBlocked = false;
                if (isToday) {
                  const minAllowedTime = new Date(bogotaNow.getTime() + 4 * 60 * 60 * 1000);
                  const [slotHour, slotMinute] = time.split(':').map(Number);
                  const timeSlotDate = set(todayInBogota, { hours: slotHour, minutes: slotMinute });
                  if (isBefore(timeSlotDate, minAllowedTime)) isTimeBlocked = true;
                }

                const isDisabled = disabledTimes.has(time) || isTimeBlocked;

                let timeStyle = {};
                let timeClass = 'py-2 px-1 rounded-lg transition-all duration-200 text-xs font-semibold';

                if (isDisabled) {
                  timeStyle = { background: 'rgba(39,39,42,0.5)', color: '#52525b', textDecoration: 'line-through', cursor: 'not-allowed' };
                } else if (isTimeSelected) {
                  timeStyle = {
                    background: 'linear-gradient(135deg, #d4af37 0%, #bf953f 100%)',
                    color: '#000000',
                    boxShadow: '0 0 14px rgba(212,175,55,0.7)',
                    fontWeight: 800,
                  };
                } else {
                  timeStyle = {
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#6ee7b7',
                  };
                }

                return (
                  <button
                    type="button"
                    key={time}
                    onClick={() => !isDisabled && setSelectedTime(time)}
                    disabled={isDisabled}
                    className={timeClass}
                    style={timeStyle}
                    onMouseEnter={e => { if (!isDisabled && !isTimeSelected) { e.currentTarget.style.background = 'rgba(16,185,129,0.28)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(16,185,129,0.4)'; } }}
                    onMouseLeave={e => { if (!isDisabled && !isTimeSelected) { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.boxShadow = 'none'; } }}
                  >
                    {format(set(new Date(), { hours: parseInt(time.split(':')[0]), minutes: parseInt(time.split(':')[1]) }), 'hh:mm a')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Línea decorativa dorada inferior */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)', marginTop: '1rem' }} />
      </div>
    </div>
  );
};

export default CustomDateTimePicker;