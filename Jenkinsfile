pipeline {
  agent any

  options {
    timestamps()
  }

  stages {
    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh '''
            set -eux
            npm ci --no-audit --no-fund
            npm test
            npm run build
          '''
        }
      }
    }

    stage('User Service Checks') {
      steps {
        dir('services/user-service') {
          sh '''
            set -eux
            npm ci --no-audit --no-fund
            npm test
            for file in src/*.js; do
              node --check "$file"
            done
          '''
        }
      }
    }

    stage('Reading Service Checks') {
      steps {
        dir('services/reading-service') {
          sh '''
            set -eux
            python3 -m venv .venv-ci
            . .venv-ci/bin/activate
            python -m pip install --upgrade pip
            pip install -r requirements.txt -r ../requirements-dev.txt
            python -m compileall -q app
            PYTHONPATH=. python -m pytest tests -q
          '''
        }
      }
    }

    stage('Analytics Service Checks') {
      steps {
        dir('services/analytics-service') {
          sh '''
            set -eux
            python3 -m venv .venv-ci
            . .venv-ci/bin/activate
            python -m pip install --upgrade pip
            pip install -r requirements.txt -r ../requirements-dev.txt
            python -m compileall -q app
            PYTHONPATH=. python -m pytest tests -q
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: true
    }
  }
}
