from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

_VALIDATION_MESSAGES = {
    "missing": "Kolom ini wajib diisi.",
    "extra_forbidden": "Kolom ini tidak didukung.",
    "json_invalid": "Badan permintaan harus berupa JSON yang valid.",
    "model_attributes_type": "Nilai harus berupa objek JSON.",
    "model_type": "Nilai harus berupa objek JSON.",
    "dict_type": "Nilai harus berupa objek JSON.",
    "list_type": "Nilai harus berupa daftar.",
    "int_type": "Isikan bilangan bulat.",
    "greater_than_equal": "Nilai minimal adalah {ge}.",
    "less_than_equal": "Nilai maksimal adalah {le}.",
    "string_type": "Nilai harus berupa teks.",
    "string_too_short": "Teks harus diisi dengan paling sedikit {min_length} karakter.",
    "string_too_long": "Teks harus berisi paling banyak {max_length} karakter.",
    "string_pattern_mismatch": "ID harus memakai huruf, angka, garis bawah, atau tanda hubung yang valid.",
    "bool_type": "Nilai harus true atau false.",
    "literal_error": "Pilih nilai yang didukung ({expected}).",
    "too_short": "Daftar harus berisi paling sedikit {min_length} entri.",
    "too_long": "Daftar harus berisi paling banyak {max_length} entri.",
}


async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    issues = []
    for error in exc.errors():
        error_type = error["type"]
        context = error.get("ctx") or {}
        if error_type == "value_error" and "error" in context:
            message = str(context["error"])
        else:
            template = _VALIDATION_MESSAGES.get(error_type, "Nilai tidak sesuai format yang diharapkan.")
            message = template.format_map(context)
        issues.append({"loc": error["loc"], "msg": message, "type": error_type})
    return JSONResponse(status_code=422, content={"detail": issues})
