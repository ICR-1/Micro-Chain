from typing import Self

from pydantic import Field, model_validator

from .models import InputModel, Scenario, Snapshot, validate_scenario


class ScenarioRequest(InputModel):
    snapshot: Snapshot
    scenario: Scenario

    @model_validator(mode="after")
    def validate_references(self) -> Self:
        validate_scenario(self.snapshot, self.scenario)
        return self


class NetworkRequest(InputModel):
    snapshot: Snapshot
    scenario: Scenario | None = None

    @model_validator(mode="after")
    def validate_references(self) -> Self:
        if self.scenario is None:
            self.scenario = Scenario(
                id="baseline", name="Normal", cutoff_date=self.snapshot.business.planning_cutoff_date,
            )
        validate_scenario(self.snapshot, self.scenario)
        return self


class CompareRequest(InputModel):
    snapshot: Snapshot
    scenarios: list[Scenario] = Field(min_length=2, max_length=3)

    @model_validator(mode="after")
    def validate_references(self) -> Self:
        if len({scenario.id for scenario in self.scenarios}) != len(self.scenarios):
            raise ValueError("ID skenario dalam perbandingan tidak boleh duplikat.")
        for scenario in self.scenarios:
            validate_scenario(self.snapshot, scenario)
        return self
